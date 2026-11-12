import type { InputTrackerEvent } from 'input-tracker'
import type { EventBatch, IngestAck } from '~/lib/study'
import type { ServiceRequest } from '~/lib/service-request'

interface StoredEvent {
  eventId: string
  trialId: string
  event: InputTrackerEvent
}
interface FinalRequest {
  trialId: string
  kind: 'submit' | 'abort'
  answers?: ServiceRequest
}
interface QueuedRequest {
  batchId: string
  trialId: string
  createdAt: number
  url: string
  body: unknown
}

function readRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Lokální zápis byl přerušen.'))
    transaction.onerror = () => reject(transaction.error)
  })
}

function openEventDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('thesis-event-queue', 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('events', { keyPath: 'eventId' })
      request.result.createObjectStore('requests', { keyPath: 'batchId' })
      request.result.createObjectStore('finals', { keyPath: 'trialId' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Zavřete ostatní karty experimentu.'))
  })
}

/** Persist each event before batching. Frozen requests keep their identity until SQL ACK. */
export class EventQueue {
  private database = openEventDatabase()
  private writes: Promise<void> = Promise.resolve()
  private flushing: Promise<void> | null = null
  private storageError: unknown

  append(trialId: string, event: InputTrackerEvent, final?: FinalRequest): Promise<void> {
    const cleanEvent = JSON.parse(JSON.stringify(event)) as InputTrackerEvent
    this.writes = this.writes
      .then(async () => {
        this.requireHealthyStorage()
        const database = await this.database
        const transaction = database.transaction(['events', 'finals'], 'readwrite')
        const completed = waitForTransaction(transaction)
        transaction
          .objectStore('events')
          .add({ eventId: event.eventId, trialId, event: cleanEvent } satisfies StoredEvent)
        if (final) transaction.objectStore('finals').put(JSON.parse(JSON.stringify(final)))
        await completed
      })
      .catch((error) => {
        this.storageError = error
      })
    return this.writes.then(() => {
      this.requireHealthyStorage()
    })
  }

  finish(trialId: string, event: InputTrackerEvent, answers?: ServiceRequest): Promise<void> {
    return this.append(trialId, event, { trialId, kind: answers ? 'submit' : 'abort', answers })
  }

  private requireHealthyStorage() {
    if (this.storageError)
      throw new Error('Událost se nepodařilo uložit v prohlížeči. Běh nelze použít k měření.')
  }

  private async freezeNextRequest(): Promise<QueuedRequest | undefined> {
    await this.writes
    this.requireHealthyStorage()
    const database = await this.database
    const transaction = database.transaction(['events', 'requests', 'finals'], 'readwrite')
    const completed = waitForTransaction(transaction)
    const storedRequests = await readRequest<QueuedRequest[]>(
      transaction.objectStore('requests').getAll(),
    )
    storedRequests.sort((a, b) => a.createdAt - b.createdAt)
    if (storedRequests[0]) {
      await completed
      return storedRequests[0]
    }
    const records = await readRequest<StoredEvent[]>(transaction.objectStore('events').getAll())
    if (!records[0]) {
      await completed
      return undefined
    }
    const trialId = records[0].trialId
    const matching: StoredEvent[] = []
    for (const record of records) if (record.trialId === trialId) matching.push(record)
    matching.sort((a, b) => a.event.sequence - b.event.sequence)
    const selected = matching.slice(0, 100)
    const events: InputTrackerEvent[] = []
    for (const record of selected) events.push(record.event)
    const batch: EventBatch = { schemaVersion: 1, batchId: crypto.randomUUID(), trialId, events }
    const lastEvent = events[events.length - 1]!
    const isFinal = lastEvent.type === 'trial.completed' || lastEvent.type === 'trial.aborted'
    let kind = 'events'
    let body: unknown = batch
    if (isFinal) {
      const final = await readRequest<FinalRequest>(transaction.objectStore('finals').get(trialId))
      if (!final) throw new Error('Chybí údaje k dokončení běhu.')
      kind = final.kind
      body = final.kind === 'submit' ? { batch, answers: final.answers } : { batch }
      transaction.objectStore('finals').delete(trialId)
    }
    const request: QueuedRequest = {
      batchId: batch.batchId,
      trialId,
      createdAt: Date.now(),
      url: `/api/trials/${trialId}/${kind}`,
      body,
    }
    transaction.objectStore('requests').add(request)
    for (const record of selected) transaction.objectStore('events').delete(record.eventId)
    await completed
    return request
  }

  async flush(): Promise<void> {
    // Recheck storage after a concurrent flush to include events appended during it.
    while (this.flushing) await this.flushing
    this.flushing = this.sendPendingRequests()
    try {
      await this.flushing
    } finally {
      this.flushing = null
    }
  }

  private async sendPendingRequests(): Promise<void> {
    while (true) {
      const request = await this.freezeNextRequest()
      if (!request) return
      let response: Response
      try {
        response = await fetch(request.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request.body),
          signal: AbortSignal.timeout(10000),
        })
      } catch {
        throw new Error(
          'Spojení se serverem není dostupné. Data zůstávají v prohlížeči; po obnovení spojení zkuste přenos znovu.',
        )
      }
      if (!response.ok)
        throw new Error(
          `Uložení zatím nebylo potvrzeno (HTTP ${response.status}). Data zůstávají v prohlížeči; zkuste přenos znovu.`,
        )
      const ack = (await response.json()) as IngestAck
      if (ack.batchId !== request.batchId) throw new Error('Server nepotvrdil očekávanou dávku.')
      const database = await this.database
      const transaction = database.transaction('requests', 'readwrite')
      const completed = waitForTransaction(transaction)
      transaction.objectStore('requests').delete(request.batchId)
      await completed
    }
  }
}
