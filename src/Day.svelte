<script>
  let active;
  export let day = { text: "Example", value: 12 };
  export let size = 0;
  export let x = 0;
  console.log(day);
</script>

<g>
  <rect
    let:hovering={active}
    {x}
    y="0"
    width={size}
    height={size}
    opacity={day / 10}
    rx={size * 0.1}
    fill="green"
  />
  {#if active}
    <text {x}>{day.text}</text>
  {/if}
</g>
