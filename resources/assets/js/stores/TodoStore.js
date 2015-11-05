/*
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * TodoStore
 */

var AppDispatcher = require('../dispatcher/AppDispatcher');
var EventEmitter = require('events').EventEmitter;
var TodoConstants = require('../constants/TodoConstants');
var TodoActions = require('../actions/TodoActions');
var assign = require('object-assign');

var CHANGE_EVENT = 'change';

var _todos = [];
var loading = false;
var loaded = false;
/**
 * Create a TODO item.
 * @param  {string} text The content of the TODO
 */
function getAllAjax()
{
  var res = [];
  $.ajax({
    method:'get',
    url:'/todo',
    success:function(data){
      TodoActions.getTodoListSuccess(data);
    }
    
  });

}

function sendTodo(variable)
{
  var text = createTodoItem(variable);
  $.ajax({
    method:'post',
    url:'/todo',
    data:text,
    success:function(data)
    {
      TodoActions.createTodoSuccess(data);
    }
  });
}

function sendToDelete(id)
{
  $.ajax({
    method:'delete',
    url:'/todo/' + id,
    success:function(data)
    {
      TodoActions.destroyCompleted(data);
    }
  });
}

function createTodoItem(text) {
  // Hand waving here -- not showing how this interacts with XHR or persistent
  // server-side storage.
  // Using the current timestamp + random number in place of a real id.
  _todo = {
    complete: true,
    text: text
  };
  return _todo;
}

/**
 * Update a TODO item.
 * @param  {string} id
 * @param {object} updates An object literal containing only the data to be
 *     updated.
 */
function update(id, updates) {
  _todos.map(function( item , key){
    if (id == item.id)
    {
      var id_ch = _todos.indexOf(item);
      _todos[id_ch] = assign({}, _todos[id_ch], updates);
      $.ajax({
        method:'put',
        url:'todo/' + id,
        data:_todos[id_ch],
        success:function(data)
        {
          console.log('success');
        }
      });
    }
  });
}

/**
 * Update all of the TODO items with the same object.
 * @param  {object} updates An object literal containing only the data to be
 *     updated.
 */
function updateAll(updates) {
  _todos.map(function(item,key){
    update(item.id,updates);
  });
}

/**
 * Delete a TODO item.
 * @param  {string} id
 */
function destroy(id) {
  console.log(id);
  // delete _todos[id];
}

/**
 * Delete all the completed TODO items.
 */
function destroyCompleted(data) {
  _todos.map(function(item,key){
    if ( item.id == data.id )
    {
      _todos.splice(key,1);
    }
  });
}
function set(data){
  _todos = data;
}

function get(){
  return _todos;
}
var TodoStore = assign({}, EventEmitter.prototype, {

  /**
   * Tests whether all the remaining TODO items are marked as completed.
   * @return {boolean}
   */
  areAllComplete: function() {
    _todos.map(function(item,key){
      if (!item.complete) {
        return false;
      }
    });
    return true;
  },

  /**
   * Get the entire collection of TODOs.
   * @return {object}
   */
  getAll: function() {

    if (!loaded && !loading) {
      setTimeout(TodoActions.getTodoListAttempt, 0);
    };
    return get();
  },

  emitChange: function() {
    this.emit(CHANGE_EVENT);
  },

  /**
   * @param {function} callback
   */
  addChangeListener: function(callback) {
    this.on(CHANGE_EVENT, callback);
  },

  /**
   * @param {function} callback
   */
  removeChangeListener: function(callback) {
    this.removeListener(CHANGE_EVENT, callback);
  }
});

// Register callback to handle all updates
AppDispatcher.register(function(action) {
  var text;

  switch(action.actionType) {
    case TodoConstants.GET_TODO_LIST_ATTEMPT:
      loading = true;
      getAllAjax();
      break;
    
    case TodoConstants.GET_TODO_LIST_SUCCESS:
      loaded = true;
      loading = false;
      set(action.data);
      break;


    case TodoConstants.TODO_CREATE:
      
      if (text !== '') {
        text = action.text.trim();
        sendTodo(text);
      }
      break;

    case TodoConstants.TODO_CREATE_SUCCESS:
      _todos.push(action.data);
      break;

    case TodoConstants.TODO_DELETE_SUCCESS:
      _todos.push(action.data);
      break;

    case TodoConstants.TODO_TOGGLE_COMPLETE_ALL:
      if (TodoStore.areAllComplete()) {
        updateAll({complete: false});
      } else {
        updateAll({complete: true});
      }
      break;

    case TodoConstants.TODO_UNDO_COMPLETE:
      // console.log(action.id);
      update(action.id, {complete: false});
      
      break;

    case TodoConstants.TODO_COMPLETE:
      update(action.id, {complete: true});
      
      break;

    case TodoConstants.TODO_UPDATE_TEXT:
      text = action.text.trim();
      if (text !== '') {
        update(action.id, {text: text});
        
      }
      break;

    case TodoConstants.TODO_DESTROY:
      sendToDelete(action.id);
      break;

    case TodoConstants.TODO_DESTROY_COMPLETED:
      destroyCompleted(action.data);
      
      break;

    default:
      // no op
  }
  TodoStore.emitChange();
});

module.exports = TodoStore;
