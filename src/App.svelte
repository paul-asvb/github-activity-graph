<script>
  import * as d3 from "d3";

  const padding = 0.05;
  const grid_row_count = 7;

  const view_width = Math.max(
    document.documentElement.clientWidth || 0,
    window.innerWidth || 0
  );

  const view_height = Math.max(
    document.documentElement.clientHeight || 0,
    window.innerHeight || 0
  );

  const element_width = view_width / grid_row_count;
  const relative_parring = view_width * padding;

  function execute(ingredient) {
    console.log("Just executed:", ingredient);
  }

  let test = Array(1000)
    .fill(0)
    .map((e) => d3.randomInt(1, 10)());

  console.log(test);

  //Create SVG element
  let svg = d3
    .select("body")
    .append("svg")
    .attr("width", view_width)
    .attr("height", view_height);

  //   svg // Select the body
  //     .selectAll("div") // Select all the p tags
  //     .data(test) // Bind our data
  //     .enter() // Grab our 'new' data points
  //     .append("div") // Add a paragraph for each
  //     .html((d) => d);

  let g = svg
    .append("g")
    .attr(
      "transform",
      `translate(${relative_parring}px, ${relative_parring}px)`
    );

  g.selectAll("rects")
    .data(test)
    .enter()
    .append("rect")
    .attr("x", (_v, index) => {
      let grid_mod = index % grid_row_count;
      return view_width - element_width - element_width * grid_mod;
    })
    .attr("y", (_v, index) => {
      let grid_mod = index % grid_row_count;
      return view_width - element_width - element_width * grid_mod;
    })
    .attr("width", element_width)
    .attr("height", element_width)
    .attr("fill", "green");
</script>
