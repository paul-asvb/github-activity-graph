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
  <rect fill="red" x="0" y="0" width="100" height="100" />
  <rect fill="yellow" x="50" y="50" width="100" height="100" />
</svg>
<!-- <rect
    fill="red"
    x={padding}
    y={padding}
    width={iw - 2 * padding}
    height={ih - 2 * padding}
  />
  <line x1="0" y1="0" x2={iw} y2={ih} stroke="black" />
  <text x="100" y="100">inner w {iw}</text>
  <text x="100" y="120">inner h{ih}</text>
  <text x="100" y="200">outer w {ow}</text>
  <text x="100" y="220">outer h {oh}</text> 

  g transform="translate({padding} {padding})">
    {#each weeks as week, i}
      <Week index={i} days={week.days} />
    {/each}
  </g
</svg-->
