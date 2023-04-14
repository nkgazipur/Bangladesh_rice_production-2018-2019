const bangladeshTopoUrl =
  "https://raw.githubusercontent.com/nkgazipur/Bangladesh_rice_production-2018-2019-/main/bangladesh_topojson_adm2_64_districts_zillas.json";

const districtUrl =
  "https://raw.githubusercontent.com/fahimreza-dev/bangladesh-geojson/master/bd-districts.json";

const riceProductionUrl =
  "https://raw.githubusercontent.com/nkgazipur/Bangladesh_rice_production-2018-2019-/main/RiceProduction2018-2019.csv";

const width = window.innerWidth;
const height = window.innerHeight;
const margin = { left: 10, right: 10, top: 10, bottom: 10 };
const legendWidth = 150;
const legendHeight = 40;
const varieties = [
  { value: "Full Year", text: "Full Year" },
  { value: "Aus", text: "Aus (April-July)" },
  { value: "Aman", text: "Aman (August-November)" },
  { value: "Boro", text: "Boro (December-March)" },
];
const gaugeWidth = 180;
const gaugeHeight = 100;
const arcMin = -Math.PI / 2;
const arcMax = Math.PI / 2;
const innerRadius = 60;
const outerRadius = 90;
const labelPad = 10;
const dataDomain = [0, 2.5, 5];
const colorOptions = ["#1a9641", "#efef5d", "#d7191c"];

const drawGauge = (selection, value, district) => {
  const arcScale = d3
    .scaleLinear()
    .domain(dataDomain)
    .range([arcMin, 0, arcMax]);

  const colorScale = d3.scaleLinear().domain(dataDomain).range(colorOptions);

  const arc = d3
    .arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .startAngle(arcMin);

  const gaugeSvg = selection
    .selectAll("svg")
    .data([null])
    .join("svg")
    .attr("width", gaugeWidth)
    .attr("height", gaugeHeight);

  const arcGenerator = gaugeSvg
    .selectAll(".arc")
    .data([null])
    .join("g")
    .attr("class", "arc");
  arcGenerator
    .selectAll(".bg-arc")
    .data([null])
    .join("path")
    .attr("class", "bg-arc");
  arcGenerator
    .selectAll(".data-arc")
    .data([null])
    .join("path")
    .attr("class", "data-arc")
    .datum({ endAngle: arcMin, startAngle: arcMin, score: dataDomain[0] })
    .attr("d", arc)
    .style("fill", colorScale(dataDomain[0]))
    .each(function (d) {
      this._current = d;
    });

  arcGenerator
    .selectAll(".arc-label")
    .data([null])
    .join("text")
    .attr("class", "arc-label");

  arcGenerator
    .selectAll(".lines")
    .data(arcScale.ticks(5).map((d) => ({ score: d })))
    .join("path")
    .attr("class", "lines");

  arcGenerator
    .selectAll(".ticks")
    .data(arcScale.ticks(5))
    .join("text")
    .attr("class", "ticks");

  const arcG = arcGenerator.attr(
    "transform",
    `translate(${gaugeWidth / 2}, ${gaugeHeight * (9 / 10)})`
  );

  arcGenerator
    .select(".bg-arc")
    .datum({ endAngle: arcMax })
    .style("fill", "#ddd")
    .attr("d", arc);

  function arcTween(a) {
    const i = d3.interpolate(this._current, a);
    this._current = i(0);
    return function (t) {
      return arc(i(t));
    };
  }

  const dataArc = arcGenerator
    .select(".data-arc")
    .datum({ score: value, startAngle: arcMin, endAngle: arcScale(value) })
    .transition()
    .duration(750)
    .style("fill", (d) => colorScale(d.score))
    .style("opacity", (d) => (d.score < dataDomain[0] ? 0 : 1))
    .attrTween("d", arcTween);

  const arcBox = arcGenerator.select(".bg-arc").node().getBBox();
  arcGenerator
    .select("text.arc-label")
    .datum({ score: value })
    .attr("x", arcBox.width / 2 + arcBox.x)
    .attr("y", -15)
    .style("alignment-baseline", "central")
    .style("text-anchor", "middle")
    .style("font-size", "2em")
    .style("font-family", "sans-serif")
    .text((d) => d3.format(".1f")(d.score));

  arcGenerator
    .selectAll(".district-label")
    .data([null])
    .join("text")
    .attr("class", "district-label")
    .attr("x", arcBox.width / 2 + arcBox.x)
    .attr("y", 0)
    .style("alignment-baseline", "central")
    .style("text-anchor", "middle")
    .style("font-size", "1em")
    .style("font-family", "sans-serif")
    .text(district);

  arcGenerator
    .selectAll(".title-label")
    .data([null])
    .join("text")
    .attr("class", "title-label")
    .attr("x", arcBox.width / 2 + arcBox.x)
    .attr("y", -40)
    .style("alignment-baseline", "central")
    .style("text-anchor", "middle")
    .style("font-size", "1em")
    .style("font-family", "sans-serif")
    .text("Yield");

  const markerLine = d3
    .radialLine()
    .angle((d) => arcScale(d))
    .radius((d, i) => innerRadius + (i % 2) * (outerRadius - innerRadius));

  arcG
    .selectAll(".lines")
    .attr("d", (d) => markerLine([d.score, d.score]))
    .style("fill", "none")
    .style("stroke-width", 2.5)
    .style("stroke", "#fff");
};

const findTotalProduction = (riceData, district) =>
  riceData
    .filter((d) => d.District === district)
    .reduce((acc, value) => acc + value.Production, 0);

const findAvgYield = (riceData, district) => {
  const filteredData = riceData.filter((d) => d.District === district);
  const sum = filteredData.reduce((acc, v) => acc + v.Yield, 0);

  return sum / filteredData.length;
};

const drawMap = (
  geoData,
  districtData,
  projection,
  pathGenerator,
  mapBound,
  riceData,
  season
) => {
  const districts = [...new Set(riceData.map((d) => d.District))];

  const productionMap = new Map(
    districts.map((d) => [d, findTotalProduction(riceData, d)])
  );

  const yieldMap = new Map(
    districts.map((d) => [d, findAvgYield(riceData, d)])
  );

  const colorScale = d3
    .scaleLinear()
    .domain([d3.min(productionMap.values()), d3.max(productionMap.values())])
    .range(["white", "green"])
    .nice();

  const yieldScale = d3
    .scaleLinear()
    .domain([d3.min(yieldMap.values()), d3.max(yieldMap.values())])
    .range(["white", "orange"]);

  const tooltip = d3.select("#tooltip");

  mapBound
    .selectAll(".district")
    .data(geoData.features)
    .join((enter) => enter.append("path").attr("fill", "white"))
    .attr("class", "district")
    .attr("d", (d) => pathGenerator(d))
    .attr("stroke", "grey")
    .attr("stroke-width", 1)
    .transition()
    .duration(1000)
    .attr("fill", (d) => colorScale(productionMap.get(d.properties.ADM2_EN)))
    .selection()
    .on("mouseover", (e, d) => {
      drawGauge(
        tooltip,
        yieldMap.get(d.properties.ADM2_EN),
        d.properties.ADM2_EN
      );
      tooltip.style("visibility", "visible");
      d3.select(e.target).attr(
        "fill",
        yieldScale(yieldMap.get(d.properties.ADM2_EN))
      );
    })
    .on("mousemove", (e, d) => {
      tooltip.style("top", `${e.pageY}px`).style("left", `${e.pageX}px`);
    })
    .on("mouseout", (e, d) => {
      tooltip.style("visibility", "hidden");
      d3.select(e.target).attr(
        "fill",
        colorScale(productionMap.get(d.properties.ADM2_EN))
      );
    });

  mapBound
    .selectAll("text")
    .data(districtData.districts)
    .join("text")
    .attr("x", (d) => projection([+d.long, +d.lat])[0])
    .attr("y", (d) => projection([+d.long, +d.lat])[1])
    .attr("font-size", 9)
    .attr("text-anchor", "middle")
    .text((d) => d.bn_name);

  const legendGroup = mapBound
    .selectAll(".legend-group")
    .data([null])
    .join("g")
    .attr("class", "legend-group")
    .attr(
      "transform",
      `translate(${(width - margin.left - margin.right) / 2 + 50}, ${
        margin.top + 150
      })`
    );

  const legendDef = legendGroup.selectAll("defs").data([null]).join("defs");

  const linearGradientId = "color-legend-test";

  const legend = legendDef
    .selectAll("linearGradient")
    .data([null])
    .join("linearGradient")
    .attr("id", linearGradientId);

  legend
    .selectAll("stop")
    .data(colorScale.range())
    .join("stop")
    .attr("stop-color", (d) => d)
    .attr("offset", (d, i) => `${i * 100}%`);

  legendGroup
    .selectAll(".legend-rect")
    .data([null])
    .join("rect")
    .attr("class", "legend-rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", `url(#${linearGradientId})`);

  legendGroup
    .selectAll("line")
    .data(colorScale.domain())
    .join("line")
    .attr("x1", (d, i) => i * legendWidth)
    .attr("x2", (d, i) => i * legendWidth)
    .attr("y2", -10)
    .attr("stroke", "grey");

  legendGroup
    .selectAll("text")
    .data(colorScale.domain())
    .join("text")
    .attr("x", (d, i) => i * legendWidth)
    .attr("y", -15)
    .attr("text-anchor", "middle")
    .text((d) => `${d3.format(",")(d)} MT`);

  legendGroup
    .selectAll(".season-title")
    .data(["null"])
    .join("text")
    .attr("class", "season-title")
    .attr("x", legendWidth / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .text(season);
};

const simplify = (geo, val) => {
  let simplified = topojson.presimplify(geo);
  let min_weight = topojson.quantile(simplified, val);
  //Every arc coordinate whose z-value is lower than min_weight is removed
  return topojson.simplify(simplified, min_weight);
};

const main = async () => {
  const topoData = await d3.json(bangladeshTopoUrl);

  const simplifiedTopo = simplify(topoData, 0.2);

  const geoData = topojson.feature(
    simplifiedTopo,
    simplifiedTopo.objects.bangladesh_geojson_adm2_64_districts_zillas
  );

  const districtData = await d3.json(districtUrl);

  const projection = d3.geoMercator().fitExtent(
    [
      [margin.left, margin.top],
      [width - margin.right, height - margin.bottom],
    ],
    geoData
  );
  const pathGenerator = d3.geoPath(projection);

  const svg = d3
    .select("#main-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const mapBound = svg.append("g");

  const riceProduction = await d3.csv(riceProductionUrl, (d) => {
    d.Production = +d.Production;
    d.Area = +d.Area;
    d.Yield = +d.Yield;
    return d;
  });

  jSuites.dropdown(document.getElementById("dropdown"), {
    data: varieties,
    value: "Full Year",
    autocomplete: true,
    width: "300px",
    onload: () => {
      drawMap(
        geoData,
        districtData,
        projection,
        pathGenerator,
        mapBound,
        riceProduction,
        "Full Year"
      );
    },
    onchange: (d, e) => {
      if (d.value === "Full Year") {
        drawMap(
          geoData,
          districtData,
          projection,
          pathGenerator,
          mapBound,
          riceProduction,
          e.getText()
        );
      } else {
        drawMap(
          geoData,
          districtData,
          projection,
          pathGenerator,
          mapBound,
          riceProduction.filter((t) => t.Variety === d.value),
          e.getText()
        );
      }
    },
  });
};
main();
