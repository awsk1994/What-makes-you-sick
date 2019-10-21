// _Front.js

var Front = {};

var condition = null;
var environments = {};

var selectedPlace = {
  lat: 0,
  lng: 0
};

var mapping = {
  'Fall': {
    'Environmental Hazards': true,
    'Building Hazards': true
  },
  'Drug Toxicity': {},
  'Overdoses': {},
  'Fever': {
    'Sanitation': true,
    'Homelessness': true,
    'Pollution': true,
    'Weather': true
  },
  'Trouble Breathing': {
    'Pollution': true,
    'Building Hazards': true
  },
  'Motor Vehicle Accident': {
    'Substance Use': true,
    'Environmental Hazards': true    
  },
  'Gun Violence': {},
  'Other': {
    'Sanitation': true, 
    'Drugs': true,
    'Natural Disasters': true,
    'Pollution': true,
    'Bad water': true,
    'Homelessness': true,
    'Nutrition': true
  }
};

var refreshView = function() {
  if (mapping[condition] == null) condition = null;
  $('#conditionList').empty();
  for (var cTag in mapping) {
    $('#conditionList').append($('<div class="btn condition '+((condition != null && cTag != condition) ? 'disabled' : '')+' btn-'+(cTag == condition ? 'primary' : 'default')+'" data-condition="'+cTag+'" style="display: inline-block;margin-right: 5px;margin-bottom: 5px;">'+cTag+'</div>'))
  }

  $('#environmentListTitle, #environmentList').toggle(!empty(mapping[condition]));
  $('#environmentList').empty();
  for (var envTag in (mapping[condition] || {})) {
    $('#environmentList').append($('<div class="btn environment btn-'+(environments[envTag] != null ? 'primary' : 'default')+'" data-environment="'+envTag+'" style="display: inline-block;margin-right: 5px;margin-bottom: 5px;">'+envTag+'</div>'));
  }

  $('.condition').unbind('click').click(function() {
    var cTag = getProp(this, 'condition');
    if (condition == cTag) {
      condition = null
    } else {
      condition = cTag;
    }
    environments = {};
    refreshView();
  });

  $('.environment').unbind('click').click(function() {
    var envTag = getProp(this, 'environment');
    if (environments[envTag] != null) {
      delete environments[envTag];
    } else {
      environments[envTag] = true;
    }
    refreshView();
  });
};


$(window).bind('keydown', function(event) {
  if (event.ctrlKey || event.metaKey) {
    switch (String.fromCharCode(event.which).toLowerCase()) {
      case 's':
        $('#save').click();
        event.preventDefault();
        break;
    }
  }
});

Front.ready = function() {
  centerOfMap = new google.maps.LatLng(42.3497, -71.106);
  map = new google.maps.Map(document.getElementById('map'), {
    center: centerOfMap,
    zoom: 12
  });
  marker = null;

  var searchBox = new google.maps.places.SearchBox($('#mapSearch')[0], {
    bounds: map.getBounds(),
    types: ['address']
  });

  searchBox.addListener('places_changed', function() {
    var places = searchBox.getPlaces();
    console.log(places);

    if (places[0] != null) {
      var currentLocation = places[0].geometry.location
      selectedPlace.lat = currentLocation.lat();
      selectedPlace.lng = currentLocation.lng();
      marker.setPosition(currentLocation);
      map.setCenter(currentLocation);
    }
  });

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      selectedPlace = {lat: position.coords.latitude, lng: position.coords.longitude};
      map.setCenter(selectedPlace);
      searchBox.setBounds(map.getBounds());
      if (marker === null) {
        marker = new google.maps.Marker({
          position: selectedPlace,
          map: map,
          draggable: true
        });
      } else {
        marker.setPosition(clickedLocation);
      }
      google.maps.event.addListener(marker, 'dragend', function(event) {
        var currentLocation = marker.getPosition();
        selectedPlace.lat = currentLocation.lat();
        selectedPlace.lng = currentLocation.lng();
      });
    });
  }

  google.maps.event.addListener(map, 'click', function(event) {                
    var clickedLocation = event.latLng;
    if (marker === null) {
      marker = new google.maps.Marker({
        position: clickedLocation,
        map: map,
        draggable: true
      });
      google.maps.event.addListener(marker, 'dragend', function(event) {
        var currentLocation = marker.getPosition();
        selectedPlace.lat = currentLocation.lat();
        selectedPlace.lng = currentLocation.lng();
      });
    } else {
      marker.setPosition(clickedLocation);
    }
    var currentLocation = marker.getPosition();
    selectedPlace.lat = currentLocation.lat();
    selectedPlace.lng = currentLocation.lng();
  });

  $('#save').click(function() {
    if (condition == null || selectedPlace.lat == 0) return;
    $.post('/new', {
      datetime: Date.now(),
      location: selectedPlace,
      cause: condition,
      locationText: $('#mapSearch').val(),
      environment: environments,
      details: $('#details').val(),
      type: 'cause'
    }, function() {
      alert('Thank you for your response!')
      window.location.href = window.location.href;
    })
  });

  refreshView();
};

