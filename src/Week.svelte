<script>
  import Day from "./Day.svelte";

  export let days = [];
  export let index = 0;
  import { getContext, setContext } from "svelte";

  const view = getContext("view");

  const element_width =
    (view.width() - view.padding * view.col_number - view.padding) /
    view.col_number;
</script>

<g transform="translate(0 {index * (element_width + view.padding)})">
  {#each days as day, i}
    <Day {day} x={i * element_width + view.padding * i} size={element_width} />
  {/each}
</g>
