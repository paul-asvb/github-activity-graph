<script>
  import Week from "./Week.svelte";
  import { setContext, getContext } from "svelte";
  let padding = 16;

  setContext("view", {
    width: () =>
      Math.max(
        document.documentElement.clientWidth || 0,
        window.innerWidth || 0
      ),
    height: () =>
      Math.max(
        document.documentElement.clientHeight || 0,
        window.innerHeight || 0
      ),
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
</script>

<svg width={view.width()} height={view.height()}
  ><g transform="translate({padding} {padding})">
    {#each weeks as week, i}
      <Week index={i} days={week.days} />
    {/each}
  </g>
</svg>
