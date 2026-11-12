<script setup lang="ts">
defineProps<{ variant: 'A' | 'B' }>()
</script>

<template>
  <div class="space-y-3 text-sm leading-6 text-slate-700">
    <p>
      Po zahájení přepište všech 12 fiktivních údajů ze zadání a odešlete formulář. Nepoužívejte
      schránku ani automatické vyplnění. Chybu opravte podle zprávy u pole.
    </p>
    <ul class="list-disc space-y-1 pl-5">
      <li>Pole i možnosti můžete vybrat myší. Tab vás přesune dál, Shift+Tab zpět.</li>
      <template v-if="variant === 'A'">
        <li>
          Nabídku otevřete Enterem nebo šipkou. Šipkami vyhledejte možnost a Enterem ji zvolte;
          Escape nabídku zavře.
        </li>
        <li>
          U priority mění šipky výběr. Datum zadejte včetně roku nebo zvolte v kalendáři. Enter v
          textovém poli může odeslat formulář.
        </li>
      </template>
      <template v-else>
        <li>
          Do všech polí můžete psát. U možností napište jejich text nebo otevřete nabídku šipkou
          dolů. Šipky pouze označují možnost; Enter nebo kliknutí ji vybere. Escape nabídku zavře.
        </li>
        <li>
          Enter potvrdí platný údaj a přesune vás dál. Datum napište včetně roku, například 15. 4.
          2027 nebo 2027-04-15.
        </li>
      </template>
    </ul>
  </div>
</template>
