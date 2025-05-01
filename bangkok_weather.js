document.addEventListener("DOMContentLoaded", () => {
  const canvas = d3.select(".canva");

  const tabButtons = d3.select(".tabs");
  const chartContainer = canvas.append("svg")
    .attr("width", 1100)
    .attr("height", 600);

  const margin = { top: 40, right: 30, bottom: 60, left: 140 };
  const graphWidth = 1000 - margin.left - margin.right;
  const graphHeight = 600 - margin.top - margin.bottom;

  const tip = d3.tip()
    .attr("class", "d3-tip")
    .offset([-10, 0])
    .html(d => `<strong>${d.label}:</strong> ${d.value}`);

  const endpoint = "https://api.open-meteo.com/v1/forecast?latitude=13.7243333&longitude=100.7701839&hourly=temperature_2m,rain,wind_speed_10m,relative_humidity_2m&timezone=Asia%2FBangkok";

  d3.json(endpoint).then(data => {
    const times = data.hourly.time.map(d => new Date(d));
    const temperature = data.hourly.temperature_2m;
    const rain = data.hourly.rain;
    const wind = data.hourly.wind_speed_10m;
    const humidity = data.hourly.relative_humidity_2m;

    const lineData = times.map((t, i) => ({
      time: t,
      temp: temperature[i]
    }));

    const latestIndex = lineData.length - 1;
    const barData = [
      { label: "Rain (mm)", value: rain[latestIndex] },
      { label: "Wind Speed (m/s)", value: wind[latestIndex] },
      { label: "Humidity (%)", value: humidity[latestIndex]},
      { label: "Temperature (°C)", value: temperature[latestIndex] }
    ];

    const indices = Array.from({length: 7}, (_, i) => i * 24 + 12);
    const clusterData = {
      temperature: indices.map(i => ({label: getDay(times[i]), value: temperature[i]})),
      rain: indices.map(i => ({label: getDay(times[i]), value: rain[i]})),
      wind: indices.map(i => ({label: getDay(times[i]), value: wind[i]})),
      humidity: indices.map(i=> ({label: getDay(times[i]), value: humidity[i]}))
    };

    tabButtons.selectAll("button").on("click", function () {
      const selected = d3.select(this).attr("data-tab");
      chartContainer.selectAll("*").remove();
      if (selected === "line") drawLineChart(lineData);
      if (selected === "bar") drawBarChart(barData);
      if (selected === "cluster") drawCluster(clusterData);
    });

    drawLineChart(lineData);

    function drawLineChart(data) {
      const x = d3.scaleTime().domain(d3.extent(data, d => d.time)).range([0, graphWidth]);
      const y = d3.scaleLinear().domain([0, d3.max(data, d => d.temp)]).range([graphHeight, 0]);

      const g = chartContainer.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
      g.call(tip);
      g.append("text").attr("x", 0).attr("y", -10).text("Temperature Over Time").attr("font-size", "16px");

      g.append("g").attr("transform", `translate(0,${graphHeight})`).call(d3.axisBottom(x));
      g.append("g").call(d3.axisLeft(y));

      g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "tomato")
        .attr("stroke-width", 2)
        .attr("d", d3.line().x(d => x(d.time)).y(d => y(d.temp)))
        .attr("stroke-dasharray", function () {
          const len = this.getTotalLength();
          return len + " " + len;
        })
        .attr("stroke-dashoffset", function () {
          return this.getTotalLength();
        })
        .transition().duration(1500).ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);

      g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.time))
        .attr("cy", d => y(d.temp))
        .attr("r", 0)
        .attr("fill", "tomato")
        .on("mouseover", function (event, d) {
          tip.show({ label: "Temp", value: d.temp.toFixed(1) + "°C" }, this);
        })
        .on("mouseout", function () {
          tip.hide();
        })
        .transition().duration(800).attr("r", 3);
    }

    function drawBarChart(data) {
      const x = d3.scaleBand().domain(data.map(d => d.label)).range([0, graphWidth]).padding(0.3);
      const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value)]).range([graphHeight, 0]);

      const g = chartContainer.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
      g.call(tip);
      g.append("text").attr("x", 0).attr("y", -10).text("Current Weather Metrics").attr("font-size", "16px");

      g.append("g").attr("transform", `translate(0,${graphHeight})`).call(d3.axisBottom(x));
      g.append("g").call(d3.axisLeft(y));

      g.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => x(d.label))
        .attr("y", graphHeight)
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .attr("fill", "#69b3a2")
        .on("mouseover", function (event, d) { tip.show(d, this); })
        .on("mouseout", function () { tip.hide(); })
        .transition().duration(800)
        .attr("y", d => y(d.value))
        .attr("height", d => graphHeight - y(d.value));
    }

    function drawCluster(dataByType) {
      const g = chartContainer.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
      g.call(tip);
      g.append("text").attr("x", 0).attr("y", -20).text("Weather Clusters - 7 Day Forecast").attr("font-size", "16px");

      const types = Object.keys(dataByType);
      const colors = {
        temperature: "tomato",
        rain: "#1f77b4",
        wind: "#6baed6",
        humidity: "#87cefa"
      };

      const scales = {
        temperature: d3.scaleLinear().domain([20, 40]).range([10, 60]),
        rain: d3.scaleLinear().domain([0, 20]).range([5, 50]),
        wind: d3.scaleLinear().domain([0, 15]).range([5, 50]),
        humidity: d3.scaleLinear().domain([0, 100]).range([10, 60])
      };

      types.forEach((type, row) => {
        const yOffset = row * 120 + 40;

        const units = {
          temperature: "Celsius",
          rain: "mm",
          wind: "km/h",
          humidity: "%"
        };

        g.append("text")
        .attr("x", -10)
        .attr("y", yOffset + 5)
        .attr("text-anchor", "end")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .text(`${type.charAt(0).toUpperCase() + type.slice(1)} (${units[type] || ""})`);

        g.selectAll("circle." + type)
        .data(dataByType[type])
        .enter().append("circle")
        .attr("cx", (_, i) => i * 130 + 100)
        .attr("cy", yOffset)
        .attr("r", 0)
        .attr("fill", colors[type])
        .attr("stroke", "#444")
        .on("mouseover", (e, d) => tip.show(d, e.target))
        .on("mouseout", () => tip.hide())
        .transition().duration(1000)
        .attr("r", d => scales[type](d.value));

        g.selectAll("text.label")
        .data(dataByType[type])
        .enter()
        .append("text")
        .attr("x", (_, i) => i * 130 + 100)
        .attr("y", yOffset + 60)
        .attr("text-anchor", "middle")
        .text(d => d.label);

      });
    }
    function getDay(date) {
      return date.toLocaleDateString("en-GB", {weekday: "short", day: "numeric"});
    }
  });
});
