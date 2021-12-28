<script>
  import Week from "./Week.svelte";
  import { setContext, getContext } from "svelte";
  let padding = 16;

  setContext("view", {
    padding,
    col_number: 7,
  });

  const view = getContext("view");

  let weeks = Array(52)
    .fill(0)
    .map((e, i) => {
      return {
        data: "id_" + i,
        days: Array(7)
          .fill(Math.floor(Math.random() * 10))
          .map((e) => ({
            value: Math.floor(e),
            text: "" + e,
          })),
      };
    });

  let w,h;
</script>

<svelte:window bind:innerWidth={w}  bind:innerHeight={h} />
<h1 style="position: absolute;">{w}</h1>
<svg width={w} height={h}
  ><g transform="translate({padding} {padding})">
    {#each weeks as week, i}
      <Week index={i} days={week.days} />
    {/each}
  </g>
</svg>
