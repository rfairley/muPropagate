$.getScript('./lib/math.js', function() {
  var bubbleArray = [];
  var iBubble = 0;
  var activeIndices = [];
  var canMove = false;
  var editMode = false;
  var editKey = 0;
  var editIndex = 0;
  var showingInfo = false;

  var unitParser = new math.parser();

  // Uses the math.js library to parse a unit given on its own (without a value)
  function parseUnit(unit) {
    return unitParser.eval("1"+unit).toString().substring(2);
  }

  var sampleTags = [
    'radius',
    'circumference',
    'diameter',
    'height',
    'width',
    'depth',
    'length',
    'concentration',
    'volume',
    'area',
    'angle',
    'mass',
    'weight',
    'force',
    'temperature',
    'atomic mass',
    'resistance',
    'voltage',
    'current'
  ];

  var sampleGroups = [
    'circle',
    'cylinder',
    'pipette',
    'rectangle',
    'line',
    'thermometer',
    'volumetric flask'
  ];

  var sampleUnits = [
    'kg',
    'm',
    'Ohm',
    'mL',
    'L',
    'mol/L',
    'm*m',
    'N',
    'Cdeg',
    'Fdeg',
    'g',
    'g/mol',
    'V',
    'A'
  ];

  function Bubble(_key, _tag, _group, _unit, _value, _absUn) {
    // properties
    this.key = _key; // Unique identifier for the Bubble
    this.tag = _tag; // Tag to be displayed - the name of the Bubble
    this.group = _group; // Group name to be displayed - the group it belongs to
    this.unit = _unit; // Units the Bubble has been given
    this.value = _value; // Numeric value the Bubble holds
    this.absUn = _absUn; // Absolute uncertainty of the value the Bubble holds
    this.relUn = _absUn / _value; // Relative uncertainty
    this.active = false; // Flag which goes true whenever the Bubble is included in a calculation
    this.child = 0; // The key of the Bubble which is the child of this one (i.e. this Bubble was one of the Bubbles used to create a new one through calculation)
    this.parents = []; // An array of the keys of the parent Bubbles, opposite logic as for child for defining parent

    // methods
    this.showTree = showTree;
    this.toggleActive = toggleActive;
    this.makeNegative = makeNegative;
    this.makeReciprocal = makeReciprocal;
  }

  /**************** BUBBLE METHODS ****************/

  function showTree() {
    // incomplete
  }

  function toggleActive() {
    this.active = !this.active;
  }

  function makeNegative() {
    this.value = -1 * this.value;
  }

  function makeReciprocal() {
    this.unit = parseUnit("(" + this.unit + ")^(-1)");
    this.value = 1 / this.value;
    this.absUn = this.relUn * this.value;
  }

  /**************** MENU FUNCTIONS ****************/

  // Add a Bubble to the array from input fields
  function createBubble() {
    var _key = iBubble;
    var _tag = document.getElementById('new-tag').value;
    var _group = document.getElementById('new-group').value;
    var _unit = parseUnit(document.getElementById('new-unit').value);
    var _value = Number(document.getElementById('new-value').value);
    var _absUn = Number(document.getElementById('new-abs-un').value);
    bubbleArray.push(new Bubble(_key, _tag, _group, _unit, _value, _absUn));
    iBubble++;
  }

  // Add a new Bubble to the array using predefined inputs
  function createNewBubble() {
    var _key = iBubble;
    var _tag = '[ ]';
    var _group = '[ ]';
    var _unit = '[ ]';
    var _value = 0;
    var _absUn = 0;
    bubbleArray.push(new Bubble(_key, _tag, _group, _unit, _value, _absUn));
    bubbleArray[getBubbleIndex(_key)].relUn = 0;
    iBubble++;
  }

  // Duplicate a Bubble and add it to the end of the array
  function duplicateBubble(duplicateKey) {
    var duplicateIndex = getBubbleIndex(duplicateKey);
    var _key = iBubble;
    var _tag = bubbleArray[duplicateIndex].tag;
    var _group = bubbleArray[duplicateIndex].group;
    var _unit = bubbleArray[duplicateIndex].unit;
    var _value = bubbleArray[duplicateIndex].value;
    var _absUn = bubbleArray[duplicateIndex].absUn;
    bubbleArray.push(new Bubble(_key, _tag, _group, _unit, _value, _absUn));
    iBubble++;
  }

  // Remove a Bubble from the array
  function removeBubble(removeKey) {
    var removeIndex = getBubbleIndex(removeKey);
    bubbleArray.splice(removeIndex, 1);
  }

  // Add all of the active Bubbles together
  function add() {
    var _key = iBubble;
    var _group = '?';
    var _unit = bubbleArray[activeIndices[0]].unit;

    var _tag = '';
    var _value = 0;
    var _absUn = 0;
    var i;

    _tag += '(';
    for (i = 0; i < activeIndices.length; i++) {
      if (i !== 0) {
        _tag += ' + ';
      }
      _tag += bubbleArray[activeIndices[i]].tag;
      _value += bubbleArray[activeIndices[i]].value;
      _absUn += Math.pow(bubbleArray[activeIndices[i]].absUn, 2);
    }
    _tag += ')';

    _absUn = Math.pow(_absUn, 0.5);

    _unit = parseUnit(_unit);

    bubbleArray.push(new Bubble(_key, _tag, _group, _unit, _value, _absUn));

    iBubble++;
  }

  // Multiply all of the active Bubbles together
  function multiply() {
    var _key = iBubble;
    var _group = '?';

    var _tag = '';
    var _unit = '';
    var _value = 1;
    var _relUn = 0;
    var i;

    _tag += '(';
    for (i = 0; i < activeIndices.length; i++) {
      if (i !== 0) {
        _tag += ' * ';
        _unit += '*';
      }
      _tag += bubbleArray[activeIndices[i]].tag;
      _unit += bubbleArray[activeIndices[i]].unit;
      _value *= bubbleArray[activeIndices[i]].value;
      _relUn += Math.pow(bubbleArray[activeIndices[i]].relUn, 2);
    }
    _tag += ')';

    _relUn = Math.pow(_relUn, 0.5);

    var _absUn = _relUn * _value;

    _unit = parseUnit(_unit);

    bubbleArray.push(new Bubble(_key, _tag, _group, _unit, _value, _absUn));

    iBubble++;
  }

  /**************** HELPER FUNCTIONS ****************/

  function clearActiveIndicesArray() {
    activeIndices = [];
  }

  function setActiveIndicesArray() {
    clearActiveIndicesArray();
    var i;
    for (i = 0; i < bubbleArray.length; i++) {
      if (bubbleArray[i].active === true) {
        activeIndices.push(i);
      }
    }
  }

  function setBubblesFalse() {
    var i;
    for (i = 0; i < bubbleArray.length; i++) {
      bubbleArray[i].active = false;
    }
  }

  function getBubbleIndex(_key) {
    var i;
    for (i = 0; i < bubbleArray.length; i++) {
      if (bubbleArray[i].key === _key) {
        return i;
      }
    }
  }

  function updateView() {
    document.getElementById('tray-active').innerHTML = '';
    document.getElementById('tray-all').innerHTML = '';

    var i;
    for (i = (bubbleArray.length - 1); i >= 0; i--) {
      var bubbleHtml = '';
      bubbleHtml += '<div id="full-bubble" class="bubble-area b-draggable" data-bkey="' + bubbleArray[i].key + '" >';
      bubbleHtml += '  <button class="bubble-button hover-grow" id="bubble-remove">x</button>';
      bubbleHtml += '  <button class="bubble-button hover-grow" id="bubble-duplicate">2</button>';
      bubbleHtml += '  <button class="bubble-button hover-grow" id="bubble-negative">-</button>';
      bubbleHtml += '  <button class="bubble-button hover-grow" id="bubble-reciprocal">/</button>';
      bubbleHtml += '  <button class="bubble-active-button hover-grow" id="bubble-active">✓</button>';
      bubbleHtml += '  <button class="bubble-edit-button hover-grow" id="bubble-edit">✐</button>';
      bubbleHtml += '  <p class="bubble-tag">' + bubbleArray[i].tag + '</p>';
      bubbleHtml += '  <div class="bubble-group-wrap"><p class="bubble-group">' + bubbleArray[i].group + '</p></div>';
      bubbleHtml += '  <p class="bubble-full-value">' + bubbleArray[i].value.toExponential(4) + '±' + bubbleArray[i].absUn.toExponential(4) + ' ' + bubbleArray[i].unit + '</p>';
      bubbleHtml += '  <p class="bubble-secondary-value">' + bubbleArray[i].value.toExponential(4) + ' ' + bubbleArray[i].unit + ' ± '+ (bubbleArray[i].relUn * 100).toFixed(3) + '%</p>';
      bubbleHtml += '</div>';

      // Add to upper or lower tray depending on active state
      if (bubbleArray[i].active === true) {
        $('#tray-active').append(bubbleHtml);
        $('[data-bkey="' + bubbleArray[i].key + '"]').find('#bubble-active').addClass('bubble-yes-active');
      }
      else {
        $('#tray-all').append(bubbleHtml);
      }
    }

    // Make the Bubbles draggable
    $('.b-draggable').draggable({
      start: function(event, ui) {
          canMove = true;
      },
      drag: function(event, ui) {
        if (canMove && (ui.position.top >= 100 || ui.position.top <= -100)) {
          var dragKey = Number($(this).attr('data-bkey'));
          var dragIndex = getBubbleIndex(dragKey);
          bubbleArray[dragIndex].toggleActive();

          setActiveIndicesArray();
          updateView();
          canMove = false;
        }
        else {
          ;
        }
      }
    });
  }

  /**************** ERROR CHECKING FUNCTIONS ****************/

  function checkAddErrors() {

    // Check for at least two Bubbles involved in calculation
    if (activeIndices.length < 2) {
      return -1;
    }

    // Check for all of the units in the active bubbles to be the same
    var addUnit = bubbleArray[activeIndices[0]].unit;
    var i;
    for (i = 0; i < activeIndices.length; i++) {
      if (parseUnit(addUnit) !== parseUnit(bubbleArray[activeIndices[i]].unit)) { // Compare the parsed versions just in case
        return -2;
      }
    }

    // No errors
    return 0;
  }

  function checkMultiplyErrors() {

    // Check for at least two Bubbles involved in calculation
    if (activeIndices.length < 2) {
      return -1;
    }

    // No errors
    return 0;
  }

  function checkReciprocalErrors(reciprocalErrorKey) {

    // Check that the value isn't 0
    var reciprocalErrorIndex = getBubbleIndex(reciprocalErrorKey);
    if (bubbleArray[reciprocalErrorIndex].value === 0) {
      return -3;
    }

    // No errors
    return 0;
  }

  /**************** "MAIN" FUNCTION ****************/

  $(document).ready(function() {

    // Bubbles and menu
    $(document).on('click', '#bubble-active', function(event) {
      var activeKey = Number($(event.target.parentElement).attr('data-bkey'));
      var activeIndex = getBubbleIndex(activeKey);
      bubbleArray[activeIndex].toggleActive();

      setActiveIndicesArray();
      updateView();
    });
    $(document).on('click', '#bubble-duplicate', function(event) {
      var duplicateKey = Number($(event.target.parentElement).attr('data-bkey'));
      duplicateBubble(duplicateKey);

      setActiveIndicesArray();
      updateView();
    });
    $(document).on('click', '#bubble-history', function() {
      // incomplete
    });
    $(document).on('click', '#bubble-remove', function(event) {
      var removeKey = Number($(event.target.parentElement).attr('data-bkey'));
      removeBubble(removeKey);

      setActiveIndicesArray();
      updateView();
    });
    $(document).on('click', '#bubble-negative', function(event) {
      var negativeKey = Number($(event.target.parentElement).attr('data-bkey'));
      var negativeIndex = getBubbleIndex(negativeKey);
      bubbleArray[negativeIndex].makeNegative();

      // No need to call setActiveIndicesArray()
      updateView();
    });
    $(document).on('click', '#bubble-reciprocal', function(event) {
      var reciprocalKey = Number($(event.target.parentElement).attr('data-bkey'));
      if (checkReciprocalErrors(reciprocalKey) === 0) {
        var reciprocalIndex = getBubbleIndex(reciprocalKey);
        bubbleArray[reciprocalIndex].makeReciprocal();

        // No need to call setActiveIndicesArray()
        updateView();
      }
      else {
        ;
      }
    });
    $('#menu-create').click(function() {
      if (Number(document.getElementById('new-value').value) === 0) {
          createNewBubble();
      }
      else {
          createBubble();
      }
      if (showingInfo === true) { // This condition means you can still press the create button from the showing info mode and it will return to calculation (normal) mode
          $('#tray-active').css('display', 'flex');
          $('#tray-all').css('display', 'flex');
          $('#b-info').css('display', 'none');
      }
      // No need to call setActiveIndicesArray() since the active array is not being updated - Bubbles by default get created as inactive
      updateView();
    });
    $('#menu-add').click(function() {
      setActiveIndicesArray();
      if (checkAddErrors() === 0) {
        add();
        setBubblesFalse();

        setActiveIndicesArray();
        updateView();
      }
      else {
        ;
      }
      if (showingInfo === true) {
          $('#tray-active').css('display', 'flex');
          $('#tray-all').css('display', 'flex');
          $('#b-info').css('display', 'none');
      }
    });
    $('#menu-multiply').click(function() {
      setActiveIndicesArray();
      if (checkMultiplyErrors() === 0) {
        multiply();
        setBubblesFalse();

        setActiveIndicesArray();
        updateView();
      }
      else {
        ;
      }
      if (showingInfo === true) {
          $('#tray-active').css('display', 'flex');
          $('#tray-all').css('display', 'flex');
          $('#b-info').css('display', 'none');
      }
    });
    $(document).on('click', '#bubble-edit', function(event) {
      if (editMode === true) {
          $('#menu-create').css('display', 'inline-block');
          $('#bubble-done-edit').css('display', 'none');
          $('[data-bkey="' + editKey + '"]').find('#bubble-edit').removeClass('bubble-yes-edit');

          editMode = false;
      }
      else {
          editMode = true;
          editKey = Number($(event.target).parents('#full-bubble').attr('data-bkey'));
          editIndex = getBubbleIndex(editKey);

          $('#menu-create').css('display', 'none');
          $('#bubble-done-edit').css('display', 'inline-block');
          $('[data-bkey="' + editKey + '"]').find('#bubble-edit').addClass('bubble-yes-edit');
      }
    });
    $(document).on('click', '#bubble-done-edit', function(event) {
      bubbleArray[editIndex].tag = document.getElementById('new-tag').value;
      bubbleArray[editIndex].group = document.getElementById('new-group').value;
      bubbleArray[editIndex].unit = parseUnit(document.getElementById('new-unit').value);
      bubbleArray[editIndex].value = Number(document.getElementById('new-value').value);
      bubbleArray[editIndex].absUn = Number(document.getElementById('new-abs-un').value);
      bubbleArray[editIndex].relUn = bubbleArray[editIndex].absUn / bubbleArray[editIndex].value;

      $('#menu-create').css('display', 'inline-block');
      $('#bubble-done-edit').css('display', 'none');
      $('[data-bkey="' + editKey + '"]').find('#bubble-edit').removeClass('bubble-yes-edit');

      editMode = false;

      setActiveIndicesArray();
      updateView();
    });
    $('#info-arrow').click(function() {
      if (showingInfo === true) {
          $('#tray-active').css('display', 'flex');
          $('#tray-all').css('display', 'flex');
          $('#b-info').css('display', 'none');
      }
      else {
          $('#tray-active').css('display', 'none');
          $('#tray-all').css('display', 'none');
          $('#b-info').css('display', 'flex');
      }
      showingInfo = !showingInfo;
    });

    // Add autocomplete features for forms
    $( "#new-tag" ).autocomplete({
      source: sampleTags,
      position: { my : "left bottom-32", of: "#new-tag" },
      autoFocus: true
    });
    $( "#new-group" ).autocomplete({
      source: sampleGroups,
      position: { my : "left bottom-32", of: "#new-group" },
      autoFocus: true
    });
    $( "#new-unit" ).autocomplete({
      source: sampleUnits,
      position: { my : "left bottom-32", of: "#new-unit" },
      autoFocus: true
    });
  });

  // editing - needs error check
  // editing - click to edit another one while in edit mode
});
