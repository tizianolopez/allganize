/**
 * Tiny little kanban board in vanilla JS
 * Might not work effectively on older browsers
 * Uses HTML5 Drag API
 * `webkitMatchesSelector` might not support older engines
 *
 * @author: Tiziano López Alonso y Marco Fiorillo
*/

(function() {
  // Cache common DOM
  var UI = {
      elBoard: document.getElementById('board'),
      elTotalCardCount: document.getElementById('totalCards'),
      elCardPlaceholder: null,
    },
    lists = [],
    todos = [],
    isDragging = false,
    _listCounter = 0, // To hold last ID/index to avoid .length based index
    _cardCounter = 0; // To hold last ID/index to avoid .length based index

  // Live binding event listener (like jQuery's .on)
  function live(eventType, selector, callback) {
    document.addEventListener(eventType, function (e) {
      if (e.target.webkitMatchesSelector(selector)) {
        callback.call(e.target, e);
      }
    }, false);
  }
  
  // Draggable Cards
  live('dragstart', '.list .card', function (e) {
    isDragging = true;
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
    e.dataTransfer.dropEffect = "copy";
    e.target.classList.add('dragging');
  });
  live('dragend', '.list .card', function (e) {
    this.classList.remove('dragging');
    UI.elCardPlaceholder && UI.elCardPlaceholder.remove();
    UI.elCardPlaceholder = null;
    isDragging = false;
  });

  // Dropzone
  live('dragover', '.list, .list .card, .list .card-placeholder', function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if(this.className === "list") { // List
      this.appendChild(getCardPlaceholder());
    } else if(this.className.indexOf('card') !== -1) { // Card
      this.parentNode.insertBefore(getCardPlaceholder(), this);
    }
  });
  
  live('drop', '.list, .list .card-placeholder', function (e) {
    e.preventDefault();
    if(!isDragging) return false;
    var todo_id = +e.dataTransfer.getData('text');
    var todo = getTodo({_id: todo_id});
    var newListID = null; 
    if(this.className === 'list') { // Dropped on List
      newListID = this.dataset.id;
      this.appendChild(todo.dom);
    } else { // Dropped on Card Placeholder
      newListID = this.parentNode.dataset.id;
      this.parentNode.replaceChild(todo.dom, this);
    }
    moveCard(todo_id, +newListID);
  });
  
  function createCard(text, listID, index) {
    if(!text || text === '') return false;
    var newCardId = ++_cardCounter;
    var card = document.createElement("div");
    var list = getList({_id: listID});
    card.draggable = true;
    card.dataset.id = newCardId;
    card.dataset.listId = listID;
    card.id = 'todo_'+newCardId;
    card.className = 'card';
    card.innerHTML = text.trim();
    var todo = {
      _id: newCardId,
      listID: listID,
      text: text,
      dom: card,
      index: index || list.cards+1 // Relative to list
    };
    todos.push(todo);
    
    // Update card count in list
    ++list.cards;
    
    return card;
  }
  
  
  function addTodo(text, listID, index, updateCounters) {
    listID = listID || 1;
    if(!text) return false;
    var list = document.getElementById('list_'+listID);
    var card = createCard(text, listID, index);
    if(index) {
      list.insertBefore(card, list.children[index]);
    } else {
      list.appendChild(card);
    }
    // Don't update DOM if said so
    if(updateCounters !== false) updateCardCounts();
  }
  
  function addList(name) {
    name = name.trim();
    if(!name || name === '') return false;
    var newListID = ++_listCounter;
    var list = document.createElement("div");
    var heading = document.createElement("h3");
    var listCounter = document.createElement("span");
    
    list.dataset.id = newListID;
    list.id = 'list_'+newListID;
    list.className = "list";
    list.appendChild(heading);
    
    heading.className = "listname";
    heading.innerHTML = name;
    heading.appendChild(listCounter)
    
    listCounter.innerHTML = 0;
    
    lists.push({
      _id: newListID,
      name: name,
      cards: 0,
      elCounter: listCounter
    });
    
    UI.elBoard.append(list);
  }
  
  function getList (obj) {
    return _.find(lists, obj);
  }
  
  function getTodo (obj) {
    return _.find(todos, obj);
  }
  
  // Update Card Counts
  // Updating DOM objects that are cached for performance
  function updateCardCounts (listArray) {
    UI.elTotalCardCount.innerHTML = 'Total Projects: '+todos.length;
    lists.map(function (list) {
      list.elCounter.innerHTML = list.cards;
    })
  }
  
  function moveCard(cardId, newListId, index) {
    if(!cardId) return false;
    try {
      var card = getTodo({_id: cardId});
      if(card.listID !== newListId) { // If different list
        --getList({_id: card.listID}).cards;
        card.listID = newListId;
        ++getList({_id: newListId}).cards;
        updateCardCounts();
      }
    
      if(index){
        card.index = index;
      }
      
    } catch (e) {
      console.log(e.message)
    }
  }
  
  live('submit', '#frmAddTodo', function (e) {
    e.preventDefault();
    addTodo(_.trim(this.todo_text.value));
    this.reset();
    return false;
  });
  live('submit', '#frmAddList', function (e) {
    e.preventDefault();
    addList(_.trim(this.list_name.value));
    this.reset();
    return false;
  });
  
  function getCardPlaceholder () {
    if(!UI.elCardPlaceholder) { // Create if not exists
      UI.elCardPlaceholder = document.createElement('div');
      UI.elCardPlaceholder.className = "card-placeholder";
    }
    return UI.elCardPlaceholder;
  }
  
  function init () {
    // Seeding
    addList('Por Hacer');
    addList('En Proceso');
    addList('Finalizado');


    updateCardCounts();
    
    moveCard(2, 1, 3);
  }

  document.addEventListener("DOMContentLoaded", function() {
    init();
  });
  
})();
let allCards = []
let draggingCard = null
let dropTarget = null
const columnNames = ['ready', 'inProgress', 'done']
const removeCardsAfterDays = 14
const removeCardsAfterMilliseconds = removeCardsAfterDays * 24 * 60 * 60 * 1000
let editingCard = null
let newCardButton

const init = () => {
    newCardButton = document.getElementById('newCardButton')
    load()
    setupColumns()
    allCards.forEach(createCard)
    updateNewButtonState()
    fadeCardsInDone()
    sortDoneColumn()
}

const load = () => {
    allCards = JSON.parse(window.localStorage.getItem('allCards')) || []
    allCards.forEach(x => {
        if (x.doneAt) {
            x.doneAt = new Date(x.doneAt)
        }
    })
}

const save = () => {
    const now = new Date()
    const cardsToSave = allCards.filter(x => getCardOpacity(now, x) > 0)
    window.localStorage.setItem('allCards', JSON.stringify(cardsToSave))
    window.localStorage.setItem('wipLimits', JSON.stringify(columnNames.map(column => ({ column, wip: columns[column].wip }))))
    updateNewButtonState()
    fadeCardsInDone()
}

const setupColumns = () => {
    columnNames.forEach(x => {
        columns[x].div = document.getElementById(`${x}Cards`)
        columns[x].div.ondrop = event => drop_handler(event, x)
        columns[x].div.ondragover = event => dragover_handler(event)
        columns[x].div.ondragenter = event => dragenter_handler(event, x)
        columns[x].div.ondragleave = event => dragleave_handler(event)
        
        const wipElement = document.getElementById(`${x}Wip`)
        if (wipElement) {
            wipElement.value = columns[x].wip
            wipElement.onchange = event => {
                columns[x].wip = wipElement.value
                save()
            }
        }
    })
}

const createCard = (cardData) => {
    const div = document.createElement('div')
    div.setAttribute('draggable', true)
    div.classList.add('card')
    div.ondragstart = event => dragstart_handler(event, cardData)
    div.ondragend = event => dragend_handler(event, cardData)
    div.innerHTML = cardData.text
    div.addEventListener('dblclick', event => editCard(cardData))
    
    cardData.div = div
    columns[cardData.column].div.appendChild(div)
}

const canMoveCardToColumn = (column) => {
    if (allCards.filter(x => x.column == column).length >= columns[column].wip) {
        return false
    }
    return true
}

const dragstart_handler = (event, cardData) => {
    draggingCard = cardData
}

const dragend_handler = (event, cardData) => {
    if (dropTarget) {
        cardData.column = dropTarget.column
        if (dropTarget.column === 'done') {
            cardData.doneAt = new Date()
        }
        dropTarget.div.appendChild(cardData.div)
        sortDoneColumn()
        save()
    }
    dropTarget = null
    draggingCard = null
}

const dragover_handler = event => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move";
}

const drop_handler = (event, column) => {
    event.preventDefault()
    clearCssClass('drop-ok')
    clearCssClass('drop-invalid')
    if (canMoveCardToColumn(column)) {
        dropTarget = { column, div: event.target }
    }
}

const dragenter_handler = (event, column) => {
    if (event.target.classList.contains('card-container') && draggingCard.column !== column) {
        event.target.classList.add(canMoveCardToColumn(column) ? 'drop-ok' : 'drop-invalid')
    }
}

const dragleave_handler = event => {
    event.target.classList.remove('drop-ok')
    event.target.classList.remove('drop-invalid')
    dropTarget = null
}

const clearCssClass = (className) => {
    Array.from(document.getElementsByClassName(className)).forEach(x => x.classList.remove(className))
}

const newCard = () => showModal()

const showModal = () => {
    const deleteButton = document.getElementById('deleteButton')
    if (editingCard) {
        deleteButton.classList.remove('hidden')
    } else {
        deleteButton.classList.add('hidden')
    }
    document.getElementById('modal').classList.remove('hidden')
    document.getElementById('cardTextInput').focus()
}

const editCard = (cardData) => {
    editingCard = cardData
    document.getElementById('cardTextInput').value = cardData.text
    showModal()
}

const cancelModal = () => {
    document.getElementById('modal').classList.add('hidden')
    document.getElementById('cardTextInput').value = ''
    editingCard = null
}

const saveCard = () => {
    var newText = document.getElementById('cardTextInput').value
    if (!editingCard) {
        const newCard = { text: newText, column: "ready" }
        allCards.push(newCard)
        createCard(newCard)
    } else {
        editingCard.text = newText
        editingCard.div.innerHTML = newText
    }
    save()
    cancelModal()
}

const deleteCard = () => {
    if (editingCard) {
        allCards = allCards.filter(x => x !== editingCard)
        save()
    }
}

const updateNewButtonState = () => {
    newCardButton.disabled = !canMoveCardToColumn("ready")
}

const fadeCardsInDone = () => {
    const now = new Date()
    allCards
        .filter(x => x.column === 'done' && x.doneAt)
        .forEach(x => x.div.setAttribute('style', `opacity: ${getCardOpacity(now, x)}%;`))
}

const getCardOpacity = (referenceTime, card) => {
    if (!card.doneAt || card.column !== 'done') {
        return 100
    }
    const doneMs = referenceTime.valueOf() - card.doneAt.valueOf()
    return 100 - Math.round(doneMs / removeCardsAfterMilliseconds * 100);
}

const sortDoneColumn = () => {
    const doneCards = allCards.filter(x => x.column === 'done')
    doneCards.sort((a, b) => b.doneAt - a.doneAt)
    doneCards.forEach(x => document.getElementById('doneCards').appendChild(x.div))
}

  
