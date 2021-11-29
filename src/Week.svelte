<script>
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
    <rect
      x={i * element_width + view.padding * i}
      y="0"
      width={element_width}
      height={element_width}
      opacity={day / 10}
      rx={element_width * 0.1}
      fill="green"
    />
  {/each}
</g>
