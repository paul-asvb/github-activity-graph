<script>
  import Day from "./Day.svelte";

  export let days = [];
  export let index = 0;
  import { getContext, setContext } from "svelte";
  const view = getContext("view");
  let w = 400;
  const element_width = () =>
    (w - view.padding * view.col_number - view.padding) / view.col_number;
</script>

<svelte:window bind:innerWidth={w} />
<g transform="translate(0 {index * (element_width() + view.padding)})">
  {#each days as day, i}
    <Day {day} x={i * element_width() + view.padding * i} size={element_width()} />
  {/each}
</g>
