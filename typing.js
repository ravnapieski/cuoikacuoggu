// ČuoikaČuoggu

fetch('mat/sanit.txt')
  .then((response) => response.text())
  .then((text) => {
    const words = text
      .split('\n')
      .map((word) => word.trim())
      .filter((word) => word.length > 0);
    window.words = words; // Store words globally
    window.wordsCount = words.length;
    window.precomputedWeights = preComputeWeights();
    window.totalWeight = precomputedWeights.reduce((sum, w) => sum + w, 0);
    newGame();
  })
  .catch((error) => console.error('Error loading the file:', error));

let gameTime = 15 * 1000; // seconds
window.timer = null;
window.gameStart = null;

function addClass(el, name) {
  if (!el) return;
  el.classList.add(name);
}

function removeClass(el, name) {
  if (!el) return;
  el.classList.remove(name);
}

function randomWord() {
  const randomIndex = Math.floor(Math.random() * wordsCount);
  return words[randomIndex];
}

function preComputeWeights(k = 0.15, short_weight = 1.3, long_weight = 0.5) {
  return words.map((word) => {
    const length = word.length;

    // Penalize words longer than 8, and slightly favor shorter words
    if (length < 6) {
      return short_weight * Math.exp(short_weight - length / 6); // exponential growth
    } else if (length > 8) {
      return long_weight / Math.exp(k * (length - 7)); // exponential decay
    }
    return 1; // No modification for words of length 6, 7 or 8
  });
}

function getWeightedRandomWord() {
  let rand = Math.random() * totalWeight;

  for (let i = 0; i < words.length; i++) {
    rand -= precomputedWeights[i];
    if (rand <= 0) {
      return words[i];
    }
  }
}

function formatWord(word) {
  return `<div class="word"><span class="letter">${word
    .split('')
    .join('</span><span class="letter">')}</span></div>`;
}

function updateGameTime() {
  document.getElementById('info').innerHTML = gameTime / 1000 + '';
}
function newGame() {
  document.getElementById('words').innerHTML = '';
  console.time('Execution Time'); // Start measuring time
  for (let i = 0; i < 200; i++) {
    document.getElementById('words').innerHTML += formatWord(
      getWeightedRandomWord()
    );
  }
  console.timeEnd('Execution Time'); // End measuring time (fallback)
  addClass(document.querySelector('.word'), 'current');
  addClass(document.querySelector('.letter'), 'current');
  removeClass(document.querySelector('.over'), 'over');

  updateGameTime();
  window.timer = null;
  window.gameStart = null;

  document.getElementById('newGameButton').classList.add('hidden');
  positionCursor();
}

// Checks if the input is a single Unicode letter from any language.
function isLetter(input) {
  return (
    typeof input === 'string' && input.length === 1 && /\p{L}/u.test(input)
  );
}

function isSpace(input) {
  return input === ' ';
}

function isBackspace(input) {
  return input === 'Backspace';
}

function positionCursor() {
  // Set the cursor position for the first word
  const firstLetter = document.querySelector('.letter.current');
  const cursor = document.getElementById('cursor');
  if (firstLetter && cursor) {
    const rect = firstLetter.getBoundingClientRect();
    cursor.style.top = rect.top + 'px'; // Add a little offset for fine-tuning
    cursor.style.left = rect.left + 'px'; // Position relative to the first letter
    //cursor.style.display = 'block';         // Ensure cursor is visible from the start
  }
}

function calculateWPM() {
  // Words Per Minute is the number of characters — including spaces and
  // punctuation — typed in one minute, divided by five.
  let correctlyTypedCharacters = 0;
  const words = [...document.querySelectorAll('.word')];
  const lastTypedWord = document.querySelector('.word.current');
  const lastTypedWordIndex = words.indexOf(lastTypedWord) + 1;
  const typedWords = words.slice(0, lastTypedWordIndex);

  for (let i = 0; i < typedWords.length; i++) {
    const letters = [...typedWords[i].children];
    const correctLetters = letters.filter((letter) =>
      letter.classList.contains('correct')
    );
    correctlyTypedCharacters += correctLetters.length;
  }
  // Add spaces to the total
  if (correctlyTypedCharacters > 0) {
    correctlyTypedCharacters += typedWords.length - 1;
  }

  console.log(`Correctly typed characters: ${correctlyTypedCharacters}`);
  return Math.round((correctlyTypedCharacters / 5) * (60000 / gameTime));
}

function makeWordsClickable() {
  // Make all words clickable with proper links after game is over
  const wordsDiv = document.getElementById('words');
  const wordElements = wordsDiv.querySelectorAll('.word');

  wordElements.forEach((wordElement) => {
    let wordText = '';
    wordElement.querySelectorAll('.letter').forEach((letterElement) => {
      if (!letterElement.classList.contains('extra')) {
        wordText += letterElement.innerText; // Add non-'extra' letter to wordText
      }
    });

    // Create link that directs to satni.org
    const link = document.createElement('a');
    link.href = `https://satni.org/${encodeURIComponent(wordText)}`;
    link.target = '_blank';
    link.classList.add('word-link'); // for styling

    link.innerHTML = wordElement.innerHTML;

    // Replace the original word element with the link
    wordElement.innerHTML = '';
    wordElement.appendChild(link);
  });
}

function gameOver() {
  clearInterval(window.timer); // Stop timer
  addClass(document.getElementById('game'), 'over');
  result = calculateWPM();
  document.getElementById('info').innerHTML = `WPM: ${result}`;

  makeWordsClickable();

  document.getElementById('newGameButton').classList.remove('hidden');
}
// keydown is better than keyup
document.getElementById('game').addEventListener('keydown', (ev) => {
  // let startTime = performance.now();

  if (
    ev.key === 'Enter' &&
    !document.getElementById('newGameButton').classList.contains('hidden')
  ) {
    gameOver();
    newGame();
    return;
  }
  if (document.querySelector('#game.over')) {
    return;
  }
  //console.log(ev); //Typed key is stored in value "key"
  const typedKey = ev.key;
  const currentWord = document.querySelector('.word.current');
  const currentLetter = document.querySelector('.letter.current');

  const expectedKey = currentLetter?.innerHTML.trim() || ' ';
  // console.log({ typedKey, expectedKey });

  const isLastLetter =
    currentWord && currentLetter === currentWord.lastElementChild;
  const isFirstLetter = currentLetter === currentWord.firstChild;

  if (!window.timer) {
    window.timer = setInterval(() => {
      if (!window.gameStart) {
        window.gameStart = new Date().getTime();
      }
      const currentTime = new Date().getTime();
      const secondsPassed = Math.round((currentTime - window.gameStart) / 1000);
      const secondsLeft = gameTime / 1000 - secondsPassed;
      if (secondsLeft <= 0) {
        gameOver();
        return;
      }
      document.getElementById('info').innerHTML = secondsLeft;
    }, 1000);
  }

  // TODO: numbers and characters

  if (isLetter(typedKey)) {
    if (currentLetter) {
      addClass(
        currentLetter,
        typedKey === expectedKey ? 'correct' : 'incorrect'
      );
      removeClass(currentLetter, 'current');
      if (currentLetter.nextSibling) {
        addClass(currentLetter.nextSibling, 'current');
      }
    } else {
      const incorrectLetter = document.createElement('span');
      incorrectLetter.innerHTML = typedKey;
      incorrectLetter.className = 'letter incorrect extra';
      currentWord.appendChild(incorrectLetter);
    }
  }

  if (isSpace(typedKey)) {
    if (typedKey === expectedKey) {
      removeClass(currentWord, 'current');
      addClass(currentWord.nextSibling, 'current');
      addClass(currentWord.nextSibling.firstChild, 'current');

      // move lines of words

      const gameDiv = document.querySelector('#game');
      // line-height in pixels
      const lineHeight = parseFloat(getComputedStyle(gameDiv).lineHeight);
      const threshold = gameDiv.getBoundingClientRect().top + 2 * lineHeight;

      if (currentWord.nextSibling?.getBoundingClientRect().top > threshold) {
        currentWord.nextSibling.scrollIntoView({
          block: 'center', // 'start' scrolls all old lines out of view
          behavior: 'instant', // 'smooth' puts cursor one line too low as
          // the animation takes some time
        });
      }
    } else {
      addClass(currentLetter, 'incorrect');
      removeClass(currentLetter, 'current');

      // Fixes bug where cursor doesn't move if space is typed
      // as the last letter of a word.
      if (!isLastLetter) {
        addClass(currentLetter.nextSibling, 'current');
      }
    }
  }

  if (isBackspace(typedKey)) {
    // TODO: Check if Control was pressed with ev.ctrlKey;
    if (!currentLetter) {
      if (currentWord.lastChild.classList.contains('extra')) {
        currentWord.lastChild.remove();
      } else {
        addClass(currentWord.lastChild, 'current');
        removeClass(currentWord.lastChild, 'incorrect');
        removeClass(currentWord.lastChild, 'correct');
      }
    } else if (currentLetter && isFirstLetter) {
      // fix bug where typing 'Backspace' as first character
      // breaks the game
      const firstWord = document.getElementById('words').firstElementChild;
      if (firstWord.firstElementChild.classList.contains('current')) {
        return;
      }
      addClass(currentWord.previousSibling, 'current');
      removeClass(currentWord, 'current');
      removeClass(currentLetter, 'current');
    } else if (currentLetter && !isFirstLetter) {
      addClass(currentLetter.previousSibling, 'current');
      removeClass(currentLetter.previousSibling, 'correct');
      removeClass(currentLetter.previousSibling, 'incorrect');
      removeClass(currentLetter, 'current');
    }
  }

  // Move cursor
  const nextLetter = document.querySelector('.letter.current');
  const nextWord = document.querySelector('.word.current');
  const cursor = document.getElementById('cursor');

  // Cursor position needs a height adjustment if typed letter was the
  // last of a word.
  if (isLastLetter) {
    // console.log('This is the last letter of the word');
    cursor.style.top =
      (nextLetter || nextWord).getBoundingClientRect().top + 4 + 'px';
  } else {
    cursor.style.top =
      (nextLetter || nextWord).getBoundingClientRect().top + 'px';
  }
  cursor.style.left =
    (nextLetter || nextWord).getBoundingClientRect()[
      nextLetter ? 'left' : 'right'
    ] + 'px';

  // let endTime = performance.now();
  // console.log(`Execution Time: ${endTime - startTime} milliseconds`);
});

document.getElementById('newGameButton').addEventListener('click', () => {
  gameOver();
  newGame();
  document.getElementById('game').focus();
});

document.getElementById('focus-error').addEventListener('click', function () {
  positionCursor();
});

// Ensures the cursor is positioned correctly once everything is loaded
window.onload = () => {
  setTimeout(positionCursor, 100);
};

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    document.getElementById('game').focus();
  }
});
document.addEventListener('click', () => {
  document.getElementById('game').focus();
});

const timeSelectionDiv = document.getElementById('time-selection');

timeSelectionDiv.addEventListener('click', (ev) => {
  if (ev.target.classList.contains('timeButton')) {
    const buttonId = ev.target.id;

    if (buttonId === 'timeButton-1') {
      gameTime = 15 * 1000;
      console.log('Game time set to 15 seconds');
    } else if (buttonId === 'timeButton-2') {
      gameTime = 30 * 1000;
      console.log('Game time set to 30 seconds');
    } else if (buttonId === 'timeButton-3') {
      gameTime = 60 * 1000;
      console.log('Game time set to 60 seconds');
    }
    const activeClassName = 'active';
    timeSelectionDiv
      .querySelectorAll(`.${activeClassName}`)
      .forEach((child) => {
        child.classList.remove(activeClassName);
      });
    document.getElementById(buttonId).classList.add(activeClassName);

    updateGameTime();
  }
});
