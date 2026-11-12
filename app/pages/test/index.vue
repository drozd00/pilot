<template>
  <div class="space-y-6">
    <section class="space-y-2">
      <h1 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        Náhled formulářů
      </h1>
      <p class="text-sm leading-6 text-slate-600">
        Pro ruční kontrolu můžete otevřít konkrétní variantu přímo. Ostrý test s backendovým
        přiřazením začíná na úvodní stránce.
      </p>
    </section>

    <section class="grid gap-3 sm:grid-cols-2">
      <NuxtLink
        to="/test/varianta-a"
        class="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-slate-300"
      >
        <InterfaceIndicator variant="A" />
        <div class="mt-1 text-base font-medium text-slate-900">První ukázka</div>
      </NuxtLink>

      <NuxtLink
        to="/test/varianta-b"
        class="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-slate-300"
      >
        <InterfaceIndicator variant="B" />
        <div class="mt-1 text-base font-medium text-slate-900">Druhá ukázka</div>
      </NuxtLink>
    </section>
  </div>
</template>
