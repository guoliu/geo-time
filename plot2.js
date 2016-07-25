  // main plotting function
  function ready(error, topology, raw) {

    // draw countries
    var country = g
    .selectAll(".countries")
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
        catch(err) { return "no data"} 
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
      .on('click', function(d) {
        time_series(result.cleaned, [d.id, -1])
      })
      .attr("d", path);
    }

    var numeNm = numeList[0],
    denoNm = denoList[0];
    var result = calculate(raw, numeNm, denoNm)
    update(result.cleaned, result.colormap, 2009);

    time_series(result.cleaned, [76, -1])

    d3.select("#deno").on("change", function(d){
      denoSwitch = -denoSwitch; 
      denoNm = denoList[(denoSwitch+0.5)|0];
      result = calculate(raw, numeNm, denoNm);
      update(result.cleaned, result.colormap, 2009);
      time_series(result.cleaned, [76, -1]);
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

 function time_series(cleaned, ids) {
  var outerRadius = 240,
  innerRadius = 205;
  gap = 2;
  // width = 560, //- margin.left - margin.right,
  // height = 560; //- margin.top - margin.bottom;

  var bandwidth = (outerRadius - innerRadius)/ids.length

  // aggregate all data
  var layers = [], values = [], years = [];
  ids.forEach(function(id) {
    var d = cleaned.get(id);
    d.data.forEach(function(y, v) {
      values.push(v.value);
      years.push(y);
    });
  });

  // calculate colormap
  var colormap = d3.scale
  .quantize()
  .domain([0, d3.max(values)])
  .range(colors);

  ids.forEach(function(id, index) {
    var d = cleaned.get(id),
    bandExtent = d3.extent(d.data.values(), function(d) {return d.value});

    colors.forEach(function(color) {
      var domain = colormap.invertExtent(color); 
      if ( (bandExtent[0]<domain[1])|(bandExtent[1]>domain[0]) ) {
        var layer = {
          data: d.data,
          name: d.name,
          y0: innerRadius + index*bandwidth + index*gap,
          domain: domain,
          color: color
        };
        layers.push(layer);
      }
    });
  });

  var angle = d3.scale.linear()
  .range([0, 2 * Math.PI])
  .domain(d3.extent(years))
  .clamp(true);

  var radius = d3.scale.linear()
  .clamp(true);

  var area = d3.svg.area.radial()
  .interpolate("cardinal-closed")
  .angle(function(d) {return angle(d.year); })
  .outerRadius(function(d) {return radius(d.value)});

  var line = d3.svg.line.radial()
  .interpolate("cardinal-closed")
  .angle(function(d) { return angle(d.time); })

  svg.selectAll(".time-layer").remove()

  var time_group = svg.append("g")
  .attr("transform", "translate(" + width/2 + "," + height / 2 + ")");

  
  // .append("svg")
  // .attr("width", width)
  // .attr("height", height)

  time_group.selectAll(".time-layer")
  .data(layers)
  .enter()
  .append("path")
  .attr("class", "time-layer")
  .attr("d", function(d) {
    radius
    .range([d.y0, d.y0 + bandwidth])
    .domain(d.domain);

    area
    .innerRadius(d.y0);

    return area(d.data.values()); } )
  .attr("fill", function(d) {return d.color});

// invisable layer for mouseover
  var invertCord = function (cord) {
    var a = Math.atan(-cord[0]/cord[1]);
    if (cord[1]>0) {
      return a + Math.PI;
    }
    else {
      if (cord[0]*cord[1]>0) {
        return a + 2*Math.PI;
      }
      else {
        return a;
      }
    }
  };

  time_group
  .append("path")
  .attr("class", "base-layer")
  .attr("id", "base")
  .attr("d", d3.svg.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .startAngle(0)
    .endAngle(2 * Math.PI)(outerRadius - innerRadius))
  .attr("fill", "transparent")
  .on('mousemove', function () {
   cord = d3.mouse(this);
   r_angle = invertCord(cord);
   //console.log(d3.svg.line.radial()([[innerRadius, r_angle], [outerRadius, r_angle]]));
   r_year = Math.round(angle.invert(r_angle));

   time_group.selectAll(".hover-ruler").remove();
   
   time_group
   .append("path")
   .attr("class", "hover-ruler")
   .attr("d", d3.svg.line.radial()([[innerRadius, r_angle], [outerRadius, r_angle]]))
   .attr("fill", "black")
   .attr('stroke', "black")
   .attr('stroke-width', 1);

   time_group
   .append("text")
   .text(r_year)
   .attr("class", "hover-ruler")
   .append("textPath") //append a textPath to the text element
   .attr("xlink:href", "#base")
   .attr("startOffset", "50%");
   //.attr("text-anchor", "middle")

 })
  .on('mouseout', function () {
    time_group.selectAll(".hover-ruler").remove();
  });

function type(d) {
  d.price =+ d.price;
  d.date = parseDate(d.date);
  return d;
}

}
