  // main plotting function
  function ready(error, topology, raw) {

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
      .quantize()
      .domain(points)
      .range(colors); 
      return {colormap: colormap, cleaned: cleaned};
    }

    // initial result
    var numeNm = numeList[0],
    denoNm = denoList[0];
    var result = calculate(raw, numeNm, denoNm);

    var clock = new clockMap("#world-map", topology, result.cleaned, result.colormap);
    clock.update(2009);
    
    var startTime = Date.now();
    var makeCallback = function() {
    // returning a new callback function each time
    return function() {
      var dt = Date.now() - startTime;
      var currentYear = startYear + Math.round(dt/yearLapse);
      if (currentYear<=endYear) {
        clock.update(currentYear);
        d3.timer(makeCallback(), yearLapse);
        return true;}
        else {return false;}
      };
    };

    d3.timer(makeCallback(), yearLapse);

    d3.select("#deno").on("change", function(d){
      denoSwitch = -denoSwitch; 
      denoNm = denoList[(denoSwitch+0.5)|0];
      result = calculate(raw, numeNm, denoNm);
      update(result.cleaned, result.colormap, 2009);
      time_series(result.cleaned, result.colormap, [76, -1]);
    });

    d3.select("#nume").on("change", function(d){
      numeSwitch = -numeSwitch; 
      numeNm = numeList[(numeSwitch+0.5)|0];
      result = calculate(raw, numeNm, denoNm);
      update(result.cleaned, result.colormap, 2009);
    });
  }

  function get_value_str(data, id, year) {
    try { var v = data.get(id).data.get(year).value;
      return (Math.round(v*10)/10).toLocaleString('en')
    }
    catch(err) {
      return "no data"
    }
  }
