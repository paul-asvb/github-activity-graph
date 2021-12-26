<script>
  let active = true;
  export let day = { text: "Example", value: 12 };
  export let size = 0;
  export let x = 0;
  let bla = "red";
  console.log(day);
</script>

<g>
  <rect
    let:hovering={active}
    {x}
    y="0"
    width={size}
    height={size}
    opacity={day.value / 10}
    rx={size * 0.1}
    fill={day.value > 0.2 ? "red" : "grey"}
  />
  {#if active}
    <text {x}>{day.text}</text>
  {/if}
</g>
