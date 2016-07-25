  // main plotting function
  function ready(error, topology, raw) {

    // draw countries
    var country = g
    .append("g")
    .selectAll("path")
    .data(topojson.feature(topology, topology.objects.countries).features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "countries")

    var tooltipMap = d3.select("#world-map").append("div").attr("class", "tooltipMap hidden");

    // draw country boundaries
    g.append("path")
    .datum(topojson.mesh(topology, topology.objects.countries, function(a, b) { return a !== b; }))
    .attr("class", "boundaries")
    .attr("d", path);

    function calculate(raw, numeNm, denoNm) {
      // data calculation
      var points = [];
      function parseData(d, numeNm, denoNm) {
        if (numeNm in d) {
          var se = [];
          $.each(d[numeNm], 
            function(y, v){
              var p = (v/(d[denoNm]));
              points.push(p);
              se.push({"year": y, "value": p});
            });
          return d3.map(se, function(d) {return d.year});
        }
        else{return null;}
      };

      var cleaned = d3.map(
        $.map(raw, function(d) { 
          return {
            id: d.id,
            name: d.name,
            data: parseData(d, numeNm, denoNm)}; 
          }), 
        function(d) {return d.id});

      var colormap = d3.scale
      .quantile()
      .domain(points)
      .range(colors); 
      return {colormap: colormap, cleaned: cleaned};
    }

    function update(cleaned, colormap, year) {  

      // set up color map and function
      var colorid = function(d) { 
        try {
          return colormap(cleaned.get(d.id).data.get(year).value);
        }
        catch(err) {return "Gainsboro";}
      }

      var strid = function(d) { 
        try {
          var datum = cleaned.get(d.id).data.get(year).value
          if (datum) {
            return Math.round(datum).toLocaleString('en');}
            else{return "no data"}
          }
        catch(err) { return "no data";} 
      }

      g.selectAll(".countries")
      .style('fill', colorid)
      .on('mousemove', function(d) {
        d3.select(this).style( "fill", "#666");
        var mouse = d3.mouse(svg.node()).map(function(d) {
          return parseInt(d);
        });
        tooltipMap.classed('hidden', false)
        .attr('style', 'left:' + (mouse[0] + 15) +
          'px; top:' + (mouse[1] - 35) + 'px')
        .html(cleaned.get(d.id).name+": "+strid(d));
      })
      .on('mouseout', function() {
        d3.select(this).style('fill', colorid);
        tooltipMap.classed('hidden', true);
      })
      .attr("d", path);;
    }

    var numeNm = numeList[0],
    denoNm = denoList[0];
    var result = calculate(raw, numeNm, denoNm)
    update(result.cleaned, result.colormap, 2009);

    time_series(result.cleaned, [-1,76], '#time-series')

    d3.select("#deno").on("change", function(d){
      denoSwitch = -denoSwitch; 
      denoNm = denoList[(denoSwitch+0.5)|0];
      result = calculate(raw, numeNm, denoNm);
      update(result.cleaned, result.colormap, 2009);
    });


    d3.select("#nume").on("change", function(d){
      numeSwitch = -numeSwitch; 
      numeNm = numeList[(numeSwitch+0.5)|0];
      result = calculate(raw, numeNm, denoNm);
      update(result.cleaned, result.colormap, 2009);
    });
  }

  function spinning_globe(trigger){
   d3.timer(function() {
    if (trigger=='start'){ 
      // get current time
      var dt = Date.now() - time;
      // get the new position from modified projection function
      projection.rotate([rotate[0] + velocity[0] * dt, rotate[1] + velocity[1] * dt]);}
      else{projection.rotate(projection.rotate());}
    // update cities position = redraw
    svg.selectAll("path").attr("d", path);
  });
 }

 function time_series(cleaned, ids, div_name) {

  // get data used in time series plot
  var series = [];
  ids.forEach(function(id) {series.push(cleaned.get(id))});

  // get total year and value range
  var values = [], years = [];
  series.forEach( function(d) {
    d.data.forEach(function(y, v) {
      values.push(v.value);
      years.push(y);
    } )
  } );

  // calculate colormap
  var colormap = d3.scale
  .quantize()
  .domain(d3.extent(values))
  .range(colors);


width = 960; //- margin.left - margin.right,
height = 69; //- margin.top - margin.bottom;

var x = d3.time.scale()
.range([0, width])
.domain(d3.extent(years));

var y = d3.scale.linear()
.range([height, 0])
.clamp(true);

var area = d3.svg.area()
.x(function(d) { return x(d.year); })
.y0(height)
.y1(function(d) { return y(d.value); });

var svg = d3.select(div_name).selectAll('svg')
.data(series)
.enter().append("svg")
.attr("width", width)
.attr("height", height)
.append("g");
//.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Add the area path elements. Note: the y-domain is set per element.
svg.each(function (d) {
  d3.select(this)
  .selectAll('svg')
  .data(colors)
  .enter()
  .append("path")
  .attr("class", "area")
  .attr("d", function(c) { 
    y.domain(colormap.invertExtent(c));
    return area(d.data.values()); })
  .attr("fill", function(c) {return c});
});

// Add a small label for the symbol name.
svg.append("text")
.attr("x", 60)
.attr("y", height - 6)
.style("text-anchor", "start")
.text(function(d) { return d.name; });

function type(d) {
  d.price = +d.price;
  d.date = parseDate(d.date);
  return d;
}


}
