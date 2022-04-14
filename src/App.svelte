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

  let iw, ih, ow, oh;
</script>

<svelte:window
  bind:innerWidth={iw}
  bind:innerHeight={ih}
  bind:outerWidth={ow}
  bind:outerHeight={oh}
/>

<svg
  height="100vh"
  width="100vw"
  viewBox="0 0 100 100"
  preserveAspectRatio="none"
>
  {#each weeks as week, i}
    <Week index={i} days={week.days} />
  {/each}
</svg>
