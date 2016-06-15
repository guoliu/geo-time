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
          var se = {};
          $.each(d[numeNm], 
            function(y, v){
              var p = (v/(d[denoNm]));
              points.push(p);
              se[y] = p;
            });
          return se;
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
        return colormap(cleaned.get(d.id).data[year]);
      }
      catch(err) {return "Gainsboro";} 
    }

    var strid = function(d) { 
      try {
        var datum = cleaned.get(d.id).data[year]
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
      tooltip.classed('hidden', false)
      .attr('style', 'left:' + (mouse[0] + 15) +
        'px; top:' + (mouse[1] - 35) + 'px')
      .html(cleaned.get(d.id).name+": "+strid(d));
    })
    .on('mouseout', function() {
      d3.select(this).style('fill', colorid);
      tooltip.classed('hidden', true);
    })
    .attr("d", path);;
  }

  var numeNm = numeList[0],
  denoNm = denoList[0];
  var result = calculate(raw, numeNm, denoNm)
  update(result.cleaned, result.colormap, 2009);

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