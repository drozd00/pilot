<script setup lang="ts">
useHead({ htmlAttrs: { lang: 'cs' }, title: 'UX a optimalizace webových formulářů | ČZU PEF' })
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <NuxtLoadingIndicator color="#0f172a" />
    <NuxtRouteAnnouncer />

    <main class="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
      <div class="mb-5 border-b border-slate-200 pb-4 text-slate-600">
        <p class="text-xs">Česká zemědělská univerzita v Praze · Provozně ekonomická fakulta</p>
        <p class="mt-1 text-sm font-medium text-slate-800">UX a optimalizace webových formulářů</p>
      </div>
      <NuxtPage />
    </main>
  </div>
</template>
