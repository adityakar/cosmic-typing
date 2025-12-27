// ============================================
// COSMIC TYPER - Word Dictionary System
// Age-appropriate words for 7-year-olds
// ============================================

const WordDictionary = {
    // === WORD CATEGORIES ===
    
    // Simple 3-letter words (CVC pattern - Consonant-Vowel-Consonant)
    cvc3: [
        'CAT', 'DOG', 'SUN', 'MOM', 'DAD', 'BIG', 'RUN', 'FUN',
        'HAT', 'BAT', 'RAT', 'MAP', 'TAP', 'JAM', 'HAM', 'BUS',
        'CUP', 'MUG', 'HUG', 'BED', 'RED', 'PEN', 'HEN', 'TEN',
        'SIT', 'HIT', 'BIT', 'HOT', 'POT', 'DOT', 'GOT', 'JOB',
        'TOY', 'BOY', 'JOY', 'BOX', 'FOX', 'MIX', 'SIX', 'FIX',
        'PIG', 'DIG', 'BIG', 'JIG', 'WIG', 'ZAP', 'ZIP', 'ZOO',
        'WET', 'PET', 'SET', 'GET', 'JET', 'LET', 'NET', 'VET',
        'GUM', 'HUM', 'SUM', 'YUM', 'BUN', 'GUN', 'NUN', 'PUN'
    ],
    
    // Simple 4-letter words
    simple4: [
        'STAR', 'MOON', 'SHIP', 'FIRE', 'JUMP', 'SPIN', 'FAST',
        'ZOOM', 'BOOM', 'ROCK', 'DUST', 'GLOW', 'BEAM', 'WAVE',
        'HERO', 'FUEL', 'TANK', 'WING', 'LAND', 'LIFT', 'DASH',
        'BALL', 'PLAY', 'GAME', 'HOME', 'LOVE', 'LIKE', 'GOOD',
        'BOOK', 'LOOK', 'COOK', 'TOOK', 'FOOD', 'MOOD', 'COOL',
        'TREE', 'FREE', 'BLUE', 'TRUE', 'CLUE', 'GLUE', 'FLEW',
        'GROW', 'SHOW', 'KNOW', 'SNOW', 'SLOW', 'FLOW', 'BLOW',
        'FISH', 'WISH', 'DISH', 'PUSH', 'RUSH', 'HUSH', 'MUCH',
        'BIRD', 'WORD', 'WORK', 'FORK', 'PORK', 'CORK', 'DOOR',
        'GIRL', 'HELP', 'HAND', 'SAND', 'BAND', 'LAND', 'FIND'
    ],
    
    // Space-themed words (fits the game theme)
    space: [
        'SUN', 'SKY', 'FLY', 'JET', 'ZIP',
        'STAR', 'MOON', 'ZOOM', 'GLOW', 'BEAM',
        'SHIP', 'FIRE', 'FUEL', 'LIFT', 'WING',
        'SPACE', 'EARTH', 'ALIEN', 'ROBOT', 'LASER',
        'BLAST', 'ORBIT', 'COMET', 'NOVA', 'PULSE',
        'ROCKET', 'PLANET', 'GALAXY', 'METEOR', 'COSMOS',
        'LAUNCH', 'FLIGHT', 'THRUST', 'ASTRO', 'STARS'
    ],
    
    // Action words kids know
    action: [
        'RUN', 'HOP', 'JOB', 'SIT', 'HIT',
        'JUMP', 'SPIN', 'DASH', 'ZOOM', 'FLIP',
        'PLAY', 'SWIM', 'SKIP', 'CLAP', 'WAVE',
        'CLIMB', 'DANCE', 'LAUGH', 'SMILE', 'SHOUT',
        'CATCH', 'THROW', 'CHASE', 'BUILD', 'PAINT'
    ],
    
    // Animal words
    animals: [
        'CAT', 'DOG', 'PIG', 'COW', 'HEN',
        'BIRD', 'FISH', 'FROG', 'BEAR', 'LION',
        'DUCK', 'GOAT', 'WOLF', 'DEER', 'SEAL',
        'TIGER', 'MOUSE', 'SNAKE', 'HORSE', 'SHEEP',
        'BUNNY', 'PUPPY', 'KITTY', 'PANDA', 'ZEBRA'
    ],
    
    // Food words
    food: [
        'HAM', 'JAM', 'PIE', 'EGG', 'NUT',
        'CAKE', 'MILK', 'RICE', 'SOUP', 'TACO',
        'PIZZA', 'APPLE', 'BREAD', 'CANDY', 'JUICE',
        'PASTA', 'SALAD', 'CHIPS', 'FRUIT', 'TOAST'
    ],
    
    // Color words
    colors: [
        'RED', 'TAN',
        'BLUE', 'PINK', 'GOLD', 'GRAY',
        'GREEN', 'WHITE', 'BLACK', 'BROWN', 'ORANGE'
    ],
    
    // Family words
    family: [
        'MOM', 'DAD', 'SIS', 'BRO',
        'BABY', 'AUNT', 'PAPA', 'MAMA', 'NANA',
        'FAMILY', 'SISTER', 'BROTHER', 'COUSIN', 'FRIEND'
    ],
    
    // Nature words
    nature: [
        'SUN', 'SKY', 'SEA', 'BUG', 'BEE',
        'TREE', 'LEAF', 'RAIN', 'WIND', 'LAKE',
        'CLOUD', 'GRASS', 'RIVER', 'OCEAN', 'BEACH',
        'FLOWER', 'FOREST', 'GARDEN', 'SUNSET', 'RAINBOW'
    ],
    
    // School words
    school: [
        'PEN', 'BAG', 'MAP', 'ART',
        'BOOK', 'MATH', 'READ', 'DESK', 'BELL',
        'CLASS', 'STUDY', 'LEARN', 'WRITE', 'PAPER',
        'SCHOOL', 'PENCIL', 'CRAYON', 'ERASER', 'FOLDER'
    ],
    
    // === DIFFICULTY LEVELS ===
    
    // Get words by difficulty level
    getByDifficulty(difficulty) {
        switch (difficulty) {
            case 'beginner':
                // Only 3-letter CVC words
                return [...this.cvc3];
            case 'easy':
                // 3-letter and simple 4-letter words
                return [...this.cvc3, ...this.simple4.filter(w => w.length <= 4)];
            case 'medium':
                // 3-5 letter words
                return [
                    ...this.cvc3,
                    ...this.simple4,
                    ...this.space.filter(w => w.length <= 5),
                    ...this.animals.filter(w => w.length <= 5),
                    ...this.action.filter(w => w.length <= 5)
                ];
            case 'hard':
                // All words including longer ones
                return [
                    ...this.simple4,
                    ...this.space,
                    ...this.animals,
                    ...this.action,
                    ...this.nature
                ];
            default:
                return [...this.cvc3];
        }
    },
    
    // Get themed word list
    getThemedWords(theme, difficulty = 'easy') {
        let baseWords = [];
        
        switch (theme) {
            case 'space':
                baseWords = this.space;
                break;
            case 'animals':
                baseWords = this.animals;
                break;
            case 'action':
                baseWords = this.action;
                break;
            case 'nature':
                baseWords = this.nature;
                break;
            case 'food':
                baseWords = this.food;
                break;
            case 'school':
                baseWords = this.school;
                break;
            default:
                baseWords = [...this.space, ...this.action]; // Mix for variety
        }
        
        // Filter by difficulty (word length)
        const maxLength = {
            'beginner': 3,
            'easy': 4,
            'medium': 5,
            'hard': 7
        }[difficulty] || 4;
        
        return baseWords.filter(w => w.length <= maxLength);
    },
    
    // Get a random word appropriate for the difficulty
    getRandomWord(difficulty = 'easy') {
        const words = this.getByDifficulty(difficulty);
        return words[Math.floor(Math.random() * words.length)];
    },
    
    // Get multiple random words without repeats
    getRandomWords(count, difficulty = 'easy') {
        const words = this.getByDifficulty(difficulty);
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    },
    
    // Get a word sequence (for typing practice)
    // Returns words that build on each other (similar starting letters)
    getWordSequence(count, difficulty = 'easy') {
        const words = this.getByDifficulty(difficulty);
        const sequence = [];
        const usedLetters = new Set();
        
        for (let i = 0; i < count; i++) {
            // Try to find words that use common letters
            const candidates = words.filter(w => !sequence.includes(w));
            if (candidates.length === 0) break;
            
            // Pick a word, preferring ones with common starting letters
            const word = candidates[Math.floor(Math.random() * candidates.length)];
            sequence.push(word);
            
            // Track letters used
            word.split('').forEach(l => usedLetters.add(l));
        }
        
        return sequence;
    },
    
    // === WORD MODE HELPERS ===
    
    // Current word state for word mode
    currentWordState: {
        word: '',
        index: 0,
        completed: []
    },
    
    // Start a new word
    startWord(difficulty = 'easy') {
        this.currentWordState.word = this.getRandomWord(difficulty);
        this.currentWordState.index = 0;
        return this.currentWordState.word;
    },
    
    // Get current letter to type
    getCurrentLetter() {
        const state = this.currentWordState;
        if (state.index >= state.word.length) return null;
        return state.word[state.index];
    },
    
    // Get remaining letters in current word
    getRemainingLetters() {
        const state = this.currentWordState;
        return state.word.slice(state.index);
    },
    
    // Get completed letters in current word
    getCompletedLetters() {
        const state = this.currentWordState;
        return state.word.slice(0, state.index);
    },
    
    // Process a key press
    processKey(key) {
        const state = this.currentWordState;
        const expected = this.getCurrentLetter();
        
        if (!expected) return { result: 'complete', word: state.word };
        
        if (key.toUpperCase() === expected) {
            state.index++;
            if (state.index >= state.word.length) {
                state.completed.push(state.word);
                return { result: 'word_complete', word: state.word };
            }
            return { result: 'correct', letter: expected, remaining: this.getRemainingLetters() };
        }
        
        return { result: 'wrong', expected: expected, pressed: key.toUpperCase() };
    },
    
    // Get word progress percentage
    getProgress() {
        const state = this.currentWordState;
        if (state.word.length === 0) return 0;
        return (state.index / state.word.length) * 100;
    }
};

// Export
window.WordDictionary = WordDictionary;
