var runningInBrowser = !(typeof window === 'undefined') || !(typeof webWorker === 'undefined');
if (runningInBrowser) {
  module = {exports: {}};
} else {
  var _ = require('lodash');
}

// Abstraction for callback communication over sockets
stream = function(setIn, outCallback, opts) {
  opts = opts || {}; // Can log time lengths for callbacks

  var listeners = {};
  var lastCallbackNum = 0;
  var that = this;
  this.send = function(label, data, opt_callback, opt_idCallback) {
    lastCallbackNum++;
    if (_.isFunction(data)) {
      // Can skip the data field if no interesting data to send
      opt_callback = data;
      data = {};
    }

    if (opt_idCallback != null) {
      opt_idCallback(lastCallbackNum);
    }
    if (opt_callback != null) {
      listeners[lastCallbackNum] = [{callback: opt_callback, sendTime: performance.now()}];
    }

    if (_.isFunction(label)) {
      label(data);
    } else {
      outCallback({
        label: label,
        data: data,//JSON.stringify(data),
        callbackNum: opt_callback != null ? lastCallbackNum : null
      }); 
    }
  };

  this.listen = function(label, callback) {
    listeners[label] = listeners[label] || [];
    listeners[label].push({callback: callback});
  }

  setIn(function(message) {
    // console.log('recd message', message);

    if (listeners[message.label] != null) {
      // benchmark2('received ' + e.data.label);
      for (var i = 0; i < listeners[message.label].length; i++) {
        // benchmark2('processing ' + message.label);
        // var response = listeners[message.label][i](JSON.parse(message.data), message.callbackNum);
        // if (listeners[message.label][i].sendTime != null && (performance.now() - listeners[message.label][i].sendTime)/1000 > 0.1) {
        //   console.log('message ', message, ' took ', (performance.now() - listeners[message.label][i].sendTime)/1000, 's');
        // }
        var response = listeners[message.label][i].callback(message.data, message.callbackNum);
        if (response != null && message.callbackNum != null) {
          // benchmark2('responding ' + message.label);
          that.send(message.callbackNum, response);
        }
      }
    }
  });
};
module.exports.stream = stream

// extends 'from' object with members from 'to'. If 'to' is null, a deep clone of 'from' is returned
var clone2 = function(from, avoid, to) {
  avoid = avoid || {};
  if (_.isFunction(from)) return null;
  if (from == null || typeof from != "object") return from;

  if (from.constructor === Array) {
    to = to || from.slice(0);
    for (var i = 0; i < to.length; i++) {
      to[i] = clone2(to[i], avoid);
    }
  } else {
    to = to || {};
    for (var name in from) {
      if (name != null && avoid[name] == null) {
        to[name] = typeof to[name] == "undefined" ? clone2(from[name], avoid) : to[name];
      }
    }
  }

  return to;
}

var clone = function(from, avoid, to) {
  // var len = from != null ? JSON.stringify(from).length : 0;
  // if (len > 40000) {
  //   console.log('clone length ' + len);
  //   debugger
  // }

  return clone2(from, avoid, to);
}
module.exports.clone = clone;

var getProp = function(that, prop) {
  return $(that).closest('[data-'+prop+']').attr('data-'+prop);
}
module.exports.getProp = getProp;

var getNewId = function(list, prefix) {
  var id = null;
  var outOf = (Object.keys(list).length + 1) * 50;

  while (id == null || list[prefix + id] != null) {
    id = Math.round(Math.random() * outOf);
  }

  return prefix + id;
}
module.exports.getNewId = getNewId;

var getParameterByName = function(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}
module.exports.getParameterByName = getParameterByName

var isDiff = function(a, b, opts) {
  opts = opts || {};
  if (opts.ignore != null) {
    // Ignore certain parameters like 'updateTime'
    var newA = {};
    for (var key in a) {
      if (opts.ignore[key] == null) newA[key] = a[key];
    }
    var newB = {};
    for (var key in b) {
      if (opts.ignore[key] == null) newB[key] = b[key];
    }
    return JSON.stringify(newA) != JSON.stringify(newB);
  }
  return JSON.stringify(a) != JSON.stringify(b);
}
module.exports.isDiff = isDiff;

var empty = function(obj) {
  return obj == null || Object.keys(obj).length == 0;
}
module.exports.empty = empty;

var formatDate = function(date, opts) {
  opts = opts || {};
  date = new Date(date);
  return (date.getMonth()+1)+'/'+(date.getDate())+ ((opts.showYear || date.getYear() != (new Date).getYear()) ? '/'+(date.getYear()+1900) : '');
};
module.exports.formatDate = formatDate;

var isProp = function(key, value) {
  return function(val) {
    return val[key] == value;
  };
}
module.exports.isProp = isProp;

var last = function(list) {
  return list[list.length - 1];
}
module.exports.last = last;

var makeId = function(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
};
module.exports.makeId = makeId;


for2 = function(opts, func, callback) {
  opts = opts || {}
  
  var done = callback || opts.done || function() {};
  var tracker = opts.track;

  if (opts.list == null) return callback;

  if (opts.list.length != null) {
    // Array
    var values = opts.list;
    var keys = range(0, opts.list.length);
  } else {
    // Obj
    var values = _.values(opts.list);
    var keys = Object.keys(opts.list);
  }

  var blockThreshold = 80; // ms

  var i = 0;
  var checkNext = function() {
    var start = performance.now();

    var stop = false;
    var wait = function() { 
      if (opts.wait != null) opts.wait(); // waiting the upper layers as well
      stop = true; 
    };
    while (i < values.length) {
      if (isDone(tracker)) return;

      // If time so far is over threshold and hasn't waited yet, start waiting
      if (!opts.block && !stop) {
        var now = performance.now();
        if (now - start > blockThreshold) {
          // console.log('took ', (now - start), 'ms');
          if (now - start > 500) {
            // Maybe tell next for loop when this last blocked so it can use that as a baseline for when to stop blocking
            // debugger
          }
          start = performance.now();

          wait(); // Don't introduce asynchrony without notifying super methods
          setTimeout(checkNext, 0);
          break;
        }
      }

      func(values[i], function(opts) {
        opts = opts || {};

        if (opts.break) {
          stop = true; // easy way to break a loop
          return done();
        }
        if (!stop) return; // Only works when waited first

        if (!opts.sync && !opts.block) { // Default to async to prevent stack traces overflowing
          setTimeout(checkNext, 0);
        } else {
          checkNext();
        }
      }, keys[i], wait);
      i++;

      if (!opts.block && !stop) {
        var now = performance.now();
        if (now - start > blockThreshold) {
          // console.log('took ', (now - start), 'ms');
          if (now - start > 500) { // Just checking
            // debugger
          }
        }
      }

      if (stop) break;
    }

    if (i == values.length && !stop && !isDone(tracker)) done(); // Actually done
  };
  checkNext();
};
module.exports.for2 = for2;

var range = function(start, end) {
  var list = [];
  for (var i = start; i < end; i++) list.push(i);
  return list;
}
module.exports.range = range;

var trackerCount = {};
var getTracker = function(title, opts) {
  opts = opts || {};

  if (trackerCount[title] == null) trackerCount[title] = 0;

  var tracker = {
    start: trackerCount[title],
    title: title,
    conditions: opts.conditions || []
  }

  tracker.step = function() {
    trackerCount[title]++;
    return getTracker(title);
  };

  return tracker;
}
module.exports.getTracker = getTracker;

var isDone = function(tracker) {
  if (tracker == null) return false;
  return trackerCount[tracker.title] > tracker.start || tracker.conditions.some(function(condition) {
    return isDone(condition);
  });
};
module.exports.isDone = isDone;

var checkErrors = function() {
  var existingDef = editObj.path == '' ? get(editObj.id) : _.get(get(editObj.id), editObj.path);
  $('#editSaveNow').text(isDiff(editObj.def, existingDef) ? 'Save Now' : 'Saved');
};

var refreshEditModal = function() {
  $('#meetingEdit').toggle(editObj.type == 'meeting' && editObj.editing);
  $('#decisionEdit').toggle(editObj.type == 'decision' && editObj.editing);
  $('#optionEdit').toggle(editObj.type == 'option' && editObj.editing);
  $('#optionView').toggle(editObj.type == 'option' && !editObj.editing);
  $('#updateEdit').toggle(editObj.type == 'update' && editObj.editing);
  $('#updateView').toggle(editObj.type == 'update' && !editObj.editing);
  $('#opinionEdit').toggle(editObj.type == 'opinion' && editObj.editing);

  $('.modal-footer').toggle(editObj.editing)

  if (editObj.type == 'meeting' && editObj.editing) {
    $('#editModalTitle').text('Edit Meeting Prep');

    $('#meetingEditName').val(editObj.def.title);
    $('#meetingEditName').unbind('input').on('input', function() {
      editObj.def.title = $(this).val();
      checkErrors();
    });

    $('#meetingEditDescription').val(editObj.def.description);
    $('#meetingEditDescription').unbind('input').on('input', function() {
      editObj.def.description = $(this).val();
      checkErrors();
    });

    $('#meetingEditTags').empty();
    for (var tag in editObj.def.tags) {
      $('#meetingEditTags').append($(
        '<div data-tag="'+tag+'" class="btn btn-default" style="margin-left: 5px;margin-top: 5px;">'+
        '   <h5 style="display: inline-block; margin-top: 0px; margin-bottom: 0px;">'+tag+'</h5>'+
        '   <span class="glyphicon glyphicon-remove removeTag" style="margin-left: 5px;"></span>'+
        '</div>'));
    }

    $('.removeTag').unbind('click').click(function() {
      var tag = getProp(this, 'tag');
      delete editObj.def.tags[tag];
      refreshEditModal();
    });

    $('#meetingEditNewTag').unbind('click').click(function() {
      var newTag = $('#meetingEditTagInput').val();
      if (newTag.trim().length == 0) return;
      editObj.def.tags[newTag] = true;
      $('#meetingEditTagInput').val('');
      refreshEditModal();
    });

    $('#meetingEditAddBefore').val(formatDate(editObj.def.admin.newDecisionsClose, {showYear: true}));
    $('#meetingEditAddBefore').unbind('input').on('input', function() {
      var date = (new Date($(this).val())).getTime();
      if (isNaN(date)) return;
      editObj.def.admin.newDecisionsClose = date;
      checkErrors();
    });

    $('#meetingEditInputBefore').val(formatDate(editObj.def.admin.decisionInteractionsClose, {showYear: true}));
    $('#meetingEditInputBefore').unbind('input').on('input', function() {
      var date = (new Date($(this).val())).getTime();
      if (isNaN(date)) return;
      editObj.def.admin.decisionInteractionsClose = date;
      checkErrors();
    });

    $('#meetingEditInputBeforeSection').toggle(editObj.def.admin.decisionInteractionsClose != null);
    $('#meetingEditInputBeforeAdd')
      .toggle(editObj.def.admin.decisionInteractionsClose == null)
      .unbind('click').click(function() {
        editObj.def.admin.decisionInteractionsClose = Date.now() + 1000*60*60*24*5;
        refreshEditModal();        
      })
    $('#meetingEditInputBeforeRemove').unbind('click').click(function() {
      delete editObj.def.admin.decisionInteractionsClose;
      refreshEditModal();
    });

  } else if (editObj.type == 'decision' && editObj.editing) {
    $('#editModalTitle').text('Edit Decision');
    $('#decisionEditName').val(editObj.def.name);
    $('#decisionEditName').unbind('input').on('input', function() {
      editObj.def.name = $(this).val();
      checkErrors();
    });

    $('#decisionMultipleOptionsInput').prop('checked', !!editObj.def.admin.multipleOptions).unbind('change').on('change', function() {
      if ($('#decisionMultipleOptionsInput').is(':checked')) {
        editObj.def.admin.multipleOptions = true;  
      } else {
        delete editObj.def.admin.multipleOptions;
      }
      checkErrors();
    });

    $('#decisionEditInputBefore').val(formatDate(editObj.def.admin.interactionsClose, {showYear: true}));
    $('#decisionEditInputBefore').unbind('input').on('input', function() {
      var date = (new Date($(this).val())).getTime();
      if (isNaN(date)) return;
      editObj.def.admin.interactionsClose = date;
      checkErrors();
    });

    $('#decisionMeetPrepSection').toggle(editObj.def.meetprep != null)
    $('#decisionMeetPrepLink')
      .text(meeting != null ? meeting.title : 'Link')
      .attr('href', '/meetprep/' + editObj.def.meetprep);

    $('#decisionInputCloseSection').toggle(editObj.def.meetprep == null && editObj.def.admin.interactionsClose != null);
    $('#decisionInputCloseAdd')
      .toggle(editObj.def.meetprep == null && editObj.def.admin.interactionsClose == null)
      .unbind('click').click(function() {
        editObj.def.admin.interactionsClose = Date.now() + 1000*60*60*24*5;
        refreshEditModal();        
      })
    $('#decisionInputCloseRemove').unbind('click').click(function() {
      delete editObj.def.admin.interactionsClose;
      refreshEditModal();
    });

    $('#decisionEditFinal').empty();
    $('#decisionEditFinal').append($('<option value="not yet">Not Final Yet</option>'));
    for (var id in editObj.def.options) {
      $('#decisionEditFinal').append($('<option value="'+id+'">'+editObj.def.options[id].title+'</option>'));
    }
    $('#decisionEditFinal').val(editObj.def.finalChoice || 'not yet');
    $('#decisionEditFinal').unbind('change').on('change', function() {
      editObj.def.finalChoice = $(this).val();
      if (editObj.def.finalChoice == 'not yet') editObj.def.finalChoice = null;
      checkErrors();
    })

  } else if (editObj.type == 'option') {
    if (editObj.editing) {
      $('#editModalTitle').text('Edit Option');

      $('#optionEditTitle').val(editObj.def.title);
      $('#optionEditTitle').unbind('input').on('input', function() {
        editObj.def.title = $(this).val();
        checkErrors();
      });

      $('#optionEditDescription').val(editObj.def.description);
      $('#optionEditDescription').unbind('input').on('input', function() {
        editObj.def.description = $(this).val();
        checkErrors();
      });

      $('#optionEditLink').val(editObj.def.link);
      $('#optionEditLink').unbind('input').on('input', function() {
        editObj.def.link = fixLink($(this).val());
        checkErrors();
      });
    } else {
      $('#editModalTitle').text('View Option');
      $('#optionViewTitle').text(editObj.def.title);

      $('#optionViewDescription').toggle(editObj.def.description.length > 0);
      $('#optionViewDescription').text('Description: ' + editObj.def.description);

      $('#optionViewLink').toggle(editObj.def.link.length > 0);
      $('#optionViewLink').html('Link: <a target="_blank" href="'+editObj.def.link+'">' + editObj.def.link + '</a>');
    }
  } else if (editObj.type == 'update') {
    if (editObj.editing) {
      $('#editModalTitle').text('Edit Update');
      $('#updateEditTitle').val(editObj.def.title);
      $('#updateEditTitle').unbind('input').on('input', function() {
        editObj.def.title = $(this).val();
        checkErrors();
      });

      $('#updateEditContent').val(editObj.def.description);
      $('#updateEditContent').unbind('input').on('input', function() {
        editObj.def.description = $(this).val();
        checkErrors();
      });

      $('#updateEditLink').val(editObj.def.link);
      $('#updateEditLink').unbind('input').on('input', function() {
        editObj.def.link = fixLink($(this).val());
        checkErrors();
      });
    } else {
      $('#editModalTitle').text('View Update');
      $('#updateViewTitle').text(editObj.def.title);
      $('#updateViewContent').text(editObj.def.description);

      $('#updateViewLink').toggle(editObj.def.link.length > 0);
      $('#updateViewLink').html('Link: <a target="_blank" href="'+editObj.def.link+'">' + editObj.def.link + '</a>');
    }
  } else if (editObj.type == 'opinion' && editObj.editing) {

    $('#editModalTitle').text('Edit Opinion About: ' + decision.options[editObj.opt].title);

    $('#opinionEditText').val(editObj.def.text);
    $('#opinionEditText').unbind('input').on('input', function() {
      editObj.def.text = $(this).val();
      checkErrors();
    });

    editObj.def.sentiment = editObj.def.sentiment || 'neutral';

    $('#opinionEditPro')
      .toggleClass('btn-default', editObj.def.sentiment != 'pro')
      .toggleClass('btn-success', editObj.def.sentiment == 'pro')
      .css('color', editObj.def.sentiment == 'pro' ? 'white' : 'green')
      .unbind('click').click(function() {
        editObj.def.sentiment = 'pro';
        refreshEditModal();
      });

    $('#opinionEditCon')
      .toggleClass('btn-default', editObj.def.sentiment != 'con')
      .toggleClass('btn-danger', editObj.def.sentiment == 'con')
      .css('color', editObj.def.sentiment == 'con' ? 'white' : 'red')
      .unbind('click').click(function() {
        editObj.def.sentiment = 'con';
        refreshEditModal();
      });

    $('#opinionEditNeutral')
      .toggleClass('btn-default', editObj.def.sentiment != 'neutral')
      .toggleClass('btn-primary', editObj.def.sentiment == 'neutral')
      .css('color', editObj.def.sentiment == 'neutral' ? 'white' : 'black')
      .unbind('click').click(function() {
        editObj.def.sentiment = 'neutral';
        refreshEditModal();
      });

    $('#opinionEditSupportList').empty();
    editObj.def.support = editObj.def.support.filter(function(supportId) {
      return decision.support[supportId] != null;
    });
    editObj.def.support.map(function(sId) {
      var support = decision.support[sId];
      if (support == null) return;
      $('#opinionEditSupportList').append($(
        '<div data-id="'+sId+'" style="margin-top: 5px;margin-bottom: 0px;display: inline-block;width: 100%;padding: 5px;" class="panel panel-default">'+
        '  <h5 style="display: inline-block;float: left;vertical-align: top;margin-left: 5px;">'+support.text+'</h5>'+
        '  <span class="glyphicon glyphicon-remove removeSupport" style="float: right;vertical-align: top;margin-right: 10px;margin-top: 10px;"></span>'+
          (support.link.trim().length > 0 ? '<a href="'+support.link+'" target="_blank"><span class="glyphicon glyphicon-link" style="float: right;vertical-align: top;margin-right: 10px;margin-top: 10px;"></span></a>' : '')+
        '</div>'));
    });

    $('.removeSupport').unbind('click').click(function() {
      var supportId = getProp(this, 'id');
      editObj.def.support = _.filter(editObj.def.support, function(id) {
        return id != supportId;
      });
      refreshEditModal();
    })

    $('#opinionEditSupportTitle').toggle(editObj.def.support.length > 0);

    $('#opinionEditAddToggle').text((!!editObj.showNewSupport ? '-' : '+') + ' Add a Supporting Observation or Citation')
    $('#opinionEditAddSection, #opinionEditAddExistingSection').toggle(!!editObj.showNewSupport);
    $('#opinionEditAddToggle').unbind('click').click(function() {
      editObj.showNewSupport = !editObj.showNewSupport;
      refreshEditModal();
    })

    $('#opinionEditAddSubmit').unbind('click').click(function() {
      var title = $('#opinionEditAddTitle').val().trim();
      var link = fixLink($('#opinionEditAddLink').val().trim());

      if (title.length == 0) return;
      // Submit new support
      var decisionChange = {
        id: decision.id,
        path: '',
        type: 'decision',
        def: clone(get(decision.id))
      };

      var supportId = getNewId(decision.support, 's');
      decisionChange.def.support[supportId] = {
        id: supportId,
        text: title,
        link: link
      };

      $('#opinionEditAddTitle').val('');
      $('#opinionEditAddLink').val('');

      backend.send('update', decisionChange, function() {
        editObj.def.support.push(supportId);
        refreshEditModal();
      });
    });

    var updateSupportSearch = function() {
      $('#opinionEditAddSearchResults').empty();
      var query = $('#opinionEditAddSearch').val().trim().toLowerCase();
      if (query.length > 0) {
        _.values(decision.support).filter(function(support) {
          return support.text.toLowerCase().indexOf(query) >= 0 && editObj.def.support.indexOf(support.id) == -1;
        }).map(function(support) {
          $('#opinionEditAddSearchResults').append($(
            '<div data-id="'+support.id+'" style="margin-top: 5px;margin-bottom: 0px;display: inline-block;width: 100%;padding: 5px;" class="panel panel-default">'+
            '  <h5 style="display: inline-block;float: left;vertical-align: top;margin-left: 5px;">'+support.text+'</h5>'+
            '  <span class="glyphicon glyphicon-plus pickSupportResult" style="float: right;vertical-align: top;margin-right: 10px;margin-top: 10px;"></span>'+
            (support.link.trim().length > 0 ? '<a href="'+support.link+'" target="_blank"><span class="glyphicon glyphicon-link" style="float: right;vertical-align: top;margin-right: 10px;margin-top: 10px;"></span></a>' : '')+
            '</div>'));
        })
      }

      $('.pickSupportResult').unbind('click').click(function() {
        var supportId = getProp(this, 'id');
        editObj.def.support.push(supportId);
        editObj.def.support = _.uniq(editObj.def.support);
        refreshEditModal();
      })
    }

    $('#opinionEditAddSearch').unbind('input').on('input', updateSupportSearch);
    updateSupportSearch();
  }

  checkErrors();
};

var refreshJump = function() {
  $('.jump').unbind('click').click(function(e) {
    var id = getProp(this, 'id');
    var path = getProp(this, 'path');
    var type = getProp(this, 'type');
    var editing = getProp(this, 'editing') == 'true';
    
    editObj = {
      id: id,
      new: false,
      path: path,
      type: type,
      editing: editing,
      def: clone(path.trim().length > 0 ? _.get(get(id), path) : get(id))
    };

    if (getProp(this, 'opt') != null) {
      editObj.opt = getProp(this, 'opt');
    }

    open();
    e.stopPropagation();
  });
}

var open = function() {
  if (editObj == null) return;
  $('#opinionEditAddSearch').val('');
  refreshEditModal();
  $('#editModal').modal('show');    
};

var getType = function(id) {
  if (id == null) return;
  if (id.slice(0, 1) == 'm') return 'meeting';
  if (id.slice(0, 1) == 'u') return 'user';
  if (id.slice(0, 1) == 'd') return 'decision';
}
module.exports.getType = getType;

var numKeys = function(obj) {
  return Object.keys(obj).length;
}
module.exports.numKeys = numKeys;

var getListByType = function(type) {
  var list = [];
  if (type == 'user') { list = users } 
  else if (type == 'decision') { list = decisionList } 
  else if (type == 'meeting') { list = meetingList } 
  return list;
}
module.exports.getListByType = getListByType;

var get = function(id) {
  var type = getType(id);
  var list = getListByType(type);
  return list[id];
};
module.exports.get = get;

var getChanceImg = function(opts) {
  opts = opts || {};

  var chance = opts.chance;
  var totalChance = opts.totalChance;

  if (opts.left == null) opts.left = 5;
  if (opts.right == null) opts.right = 7;
  if (chance.prob == null) chance = {prob: chance};
  if (totalChance == null) totalChance = {prob: 1};
  if (totalChance.prob == null) totalChance = {prob: totalChance};

  var degrees = chance.prob / totalChance.prob * 360;
  if (degrees > 359.99) degrees = 359.99;
  var grey = '#' + (opts.color || '888');

  var rad = (opts.size || 20) / 2

  return '<svg class="chanceImg" xmlns="http://www.w3.org/2000/svg" '+
    'style="width: '+(rad*2)+'px; height: '+(rad*2)+'px; margin-left: '+opts.left+'px; margin-right: '+opts.right+'px; display: inline; position: relative; top: '+(opts.top != null ? opts.top : (rad/2))+'px;" '+(opts.extra || '')+'>'+
      '<title>'+getChanceText(chance, totalChance)+'</title></polygon>'+
      '<circle cx="'+rad+'" cy="'+rad+'" r="'+(rad-1)+'" stroke="none" stroke-width="1" fill="#c51616"/>'+
      '<path fill="'+grey+'" stroke="none" d="'+describeArc(rad-1, rad-1, rad-1, 0, degrees)+'"></path>'+
      // '<circle cx="'+rad+'" cy="'+rad+'" r="'+(rad-1)+'" stroke="'+grey+'" stroke-width="1" fill="none"/>'+
    '</svg>';

  // return '<img class="chanceImg" title="'+getChanceText(chance, totalChance)+'" src="./pie.svg?d='+(chance.prob / totalChance.prob * 360)+(opts.color != null ? '&color=' + opts.color : '')+'" style="width: 20px; height: 20px; margin-left: 5px; margin-right: '+opts.right+'px; display: inline;">'
}
module.exports.getChanceImg = getChanceImg;


var polarToCartesian = function(centerX, centerY, radius, angleInDegrees) {
  var angleInRadians = (angleInDegrees + 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

var describeArc = function(x, y, radius, startAngle, endAngle){
  var start = polarToCartesian(x+1, y+1, radius, 180 + endAngle);
  var end = polarToCartesian(x+1, y+1, radius, 180 + startAngle);

  if (isNaN(start.x) || isNaN(start.y)) debugger
  
  var arcSweep = endAngle - startAngle <= 180 ? "0" : "1";
  var d = [
        "M", radius+1, radius+1, 
        "L", start.x, start.y, 
        "A", radius, radius, 0, arcSweep, 0, end.x, end.y,
        "L", radius+1, radius+1
  ].join(" ");

  return d;
};


var getChanceText = function(chance, totalChance, opts) {
  opts = opts || {};
  if (chance == null) return;
  if (chance.prob == null) chance = {prob: chance};
  if (totalChance == null) totalChance = 1;
  if (totalChance.prob == null) totalChance = {prob: totalChance};

  var chanceText = chance.num + '/' + totalChance.num;
  // if (chance.prob == 0) return;

  var cutOff = opts.cutOff != null ? opts.cutOff : 0.01;
  var decimals = opts.decimals != null ? opts.decimals : 1;

  if (opts.noCutoff) {
    if (chance.prob / totalChance.prob * 100 < 0.01) {
      var chanceText = (chance.prob / totalChance.prob * 100).toExponential(2) + '%';
    } else {
      var chanceText = (Math.round(100 * (chance.prob / totalChance.prob * 100))/100) + '%';
    }
  } else if (chance.prob / totalChance.prob >= cutOff) {
    var chanceText = (Math.round((100*Math.pow(10,decimals-1))*chance.prob / totalChance.prob) / (Math.pow(10, decimals-1))) + '%';
  } else if (chance.prob == 0) {
    var chanceText = '0%';
  } else {//if (chance.prob > 0) {
    var chanceText = '<'+(Math.round(1000*cutOff) / 10)+'%';//(100*chance.prob / totalChance.prob).toExponential(1) + '%';
  }
  return chanceText;
};
module.exports.getChanceText = getChanceText

var processVotes = function(votes, target) {
  var total = numKeys(votes);
  var count = _.values(votes).filter(function(item) {
    if (item.choice != null) return item.choice == target;
    if (item.choices != null) return item.choices[target] != null;
  }).length;
  var diff = count - (total - count);

  return {
    total: total,
    diff: diff,
    pos: count,
    neg: total - count,
    count: count,
    chance: total == 0 ? 1 : count / total,
    color: total == 0 ? 'bbb' : '00a200'
  }
}
module.exports.processVotes = processVotes

var fixLink = function(url) {
  return !/^https?:\/\//i.test(url) ? 'http://' + url : url;
}
module.exports.fixLink = fixLink
