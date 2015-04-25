'use strict'

var parse = require('parse-grid-bench')
var ndarray = require('ndarray')
var nets = require('nets')
var createRenderer = require('./render')
var codes = require('../bench/codes')
var files = require('./meta.json')

module.exports = createMapLoader

function grabFile(url, cb) {
  var burl = 'https://mikolalysenko.github.io/sturtevant-grid-benchmark/' + url.slice(1)
  nets({ url: burl, encoding: 'utf-8' }, function(err, resp, body) {
    cb(err, body)
  })
}

function createMapLoader() {
  var canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256

  var renderer = createRenderer([32,32], canvas)
  renderer.scenario = []

  var mapDiv = document.createElement('p')
  mapDiv.style.position = 'absolute'
  mapDiv.style.left = '5%'
  mapDiv.style.top = '20px'
  mapDiv.style.width = '90%'
  mapDiv.style.height = '30px'

  var mapSelect = document.createElement('select')
  mapSelect.style.margin = '5px'
  mapDiv.appendChild(mapSelect)

  var codeSelect = document.createElement('select')
  codeSelect.style.display = 'inline'
  codeSelect.style.margin = '5px'
  var codeNames = Object.keys(codes)
  for(var i=0; i<codeNames.length; ++i) {
    codeSelect.options.add(new Option(codeNames[i], codeNames[i]))
  }

  codeSelect.addEventListener('change', function() {
    renderer.search = renderer.algorithms[codeSelect.value]
    renderer.events.emit('planner-change')
  })

  function rebuildAlgorithms() {
    renderer.algorithms = {}
    for(var i=0; i<codeNames.length; ++i) {
      var name = codeNames[i]
      var code = codes[name]
      renderer.algorithms[name] = code(renderer.grid)
    }
    renderer.search = renderer.algorithms[codeSelect.value]
  }

  mapDiv.appendChild(codeSelect)

  var scenarioButton = document.createElement('input')
  scenarioButton.type = 'button'
  scenarioButton.value = 'Run Benchmark'
  scenarioButton.style.display = 'inline'
  scenarioButton.disabled = true
  scenarioButton.style.margin = '5px'
  mapDiv.appendChild(scenarioButton)
  scenarioButton.addEventListener('click', function() {
    renderer.events.emit('benchmark')
  })

  var timeDiv = document.createElement('div')
  timeDiv.style.display = 'inline'
  timeDiv.style.margin = '5px'
  mapDiv.appendChild(timeDiv)

  renderer.logMessage = function(str) {
    timeDiv.innerHTML = str
  }

  document.body.appendChild(mapDiv)

  var canvasDiv = document.createElement('div')
  canvasDiv.style.position = 'absolute'
  canvasDiv.style.left = '5%'
  canvasDiv.style.bottom = '5%'
  canvasDiv.style.width = '90%'
  canvasDiv.style.height = '80%'

  canvasDiv.style.overflow = 'scroll'
  canvasDiv.appendChild(canvas)

  document.body.appendChild(canvasDiv)


  function disable() {
    mapSelect.disabled = true
    codeSelect.disabled = true
    scenarioButton.disabled = true
  }

  function enable() {
    mapSelect.disabled = false
    codeSelect.disabled = false
    if(renderer.scenario.length > 0) {
      scenarioButton.disabled = false
    }
  }


  var data = ndarray(new Uint8Array(32*32), [32,32])

  var fileNames = Object.keys(files)

  for(var i=0; i<fileNames.length; ++i) {
    mapSelect.options.add(new Option(fileNames[i], fileNames[i]))
  }


  mapSelect.addEventListener('change', function() {
    var file = files[fileNames[mapSelect.selectedIndex]]
    disable()

    function handleError(err) {
      alert('Error loading map data')
      enable()
    }

    grabFile(file.map, function(err, mapData) {
      if(err) {
        handleError(err)
        return
      }

      var map = parse.map(mapData)

      if(!map) {
        handleError(err)
        return
      }

      if(file.scenario) {
        grabFile(file.scenario, function(err, scenData) {
          if(err || !(renderer.scenario = parse.scen(scenData))) {
            renderer.scenario = []
          }
          enable()
          renderer.grid = map
          renderer.shape = map.shape.slice()
          canvas.width = renderer.shape[0]*8
          canvas.height = renderer.shape[1]*8
          rebuildAlgorithms()
          renderer.events.emit('data-change')
        })
      } else {
        enable()
        renderer.grid = map
        renderer.shape = map.shape.slice()
        canvas.width = renderer.shape[0]*8
        canvas.height = renderer.shape[1]*8
        renderer.scenario = []
        rebuildAlgorithms()
        renderer.events.emit('data-change')
      }
    })
  })

  renderer.grid = data

  renderer.events.on('render', function() {
    var data = renderer.grid
    for(var i=0; i<data.shape[0]; ++i) {
      for(var j=0; j<data.shape[1]; ++j) {
        if(data.get(i,j)) {
          renderer.tile(i, j, '#ccc')
        }
      }
    }
  })

  rebuildAlgorithms()

  return renderer
}
