<script>
  import Day from "./Day.svelte";
  export let days = [];
  export let index = 0;
  let padding = 1;
  const element_width = () => (100 - padding * 7 - padding) / 7;
</script>

<g
  transform="translate({padding} {index * (element_width() + padding) +
    padding})"
>
  {#each days as day, i}
    <Day {day} x={i * element_width() + padding * i} size={element_width()} />
  {/each}
</g>
