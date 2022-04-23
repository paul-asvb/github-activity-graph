<script>
  let active = false;
  export let day = { text: "Example", value: 12 };
  export let size = 0;
  export let x = 0;
  console.log(day)
</script>

<g transform="translate({x} 0)">
  <rect
    let:hovering={active}
    x=0
    y=0
    width={size}
    height={size}
    opacity={day.value}
    rx={size * 0.05}
    fill="red"
  />
  {#if active}
    <text {x}>{day.text}</text>
  {/if}
</g>
