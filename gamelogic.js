"use strict";
// var random = require('math-random');

// See "hand scoring.txt" for an explanation of where these values come from.
// They are defined so that 
// coefficients
const var C_STR_FLUSH = 341385748704;
const var C_4_KIND    = 24384696336;
const var C_FH_FLUSH  = 8128232112;
const var C_STRAIGHT  = 738930192;
const var C_3_KIND    = 52780728;
const var C_BEST_PAIR = 3770052;
const var C_NEXT_PAIR = 290004;
const var C_KICKERS = [22308, 1716, 132, 11, 1];

// offsets
const var O_STRAIGHT  = 3;
const var O_N_KIND    = 0;
const var O_FACEVALUE = 1;

// Alright, now to actual object declarations.

// This object represents a single card in the game.
// The format of the values within is:
// Value: Jack = 11, Queen = 12, King = 13, Ace = 14.
// (do note however that Ace must be also treated as a 1 in order to count A-2-3-4-5 straights)
// Suit: 0 = Spades, 1 = Hearts, 2 = Clubs, 3 = Diamonds, 4+ = dummy card

class Card {
	// Arguments must be two integers.
	constructor(value, suit) {
		this.suit = suit;
		this.value = 0;

		if (suit < 4)
			this.value = value;
	}

	// Returns the difference in values between cards. Positive means this card is higher,
	// negative means other is higher.
	compareTo(otherCard) {
		return this.value - otherCard.value;
	}

	// Determine if this card is an Ace and needs to be handled carefully.
	isAce() {
		if (this.value == 14)
			return true;
		return false;
	}

	isDummy() {
		if (this.suit > 4)
			return true;
	}

	get getValue() {
		return this.value;
	}

	get getSuit() {
		return this.suit;
	}
}

// This class contains an array of up to 7 cards
class Hand {
	constructor() {
		this.cards = [];
		this.faceups = [];
	}

	// toAdd is a Card object, and isFaceUp is true/false
	addCard(toAdd, isFaceUp) {
		var i = 0;
		var succeeded = false;

		// Look for the first open position to insert the card into
		while (succeeded == false) {
			if (this.cards[i] === null || this.cards[i] === undefined) {
				this.cards[i] = toAdd;
				this.faceups[i] = isFaceUp;
				succeeded = true;
			}
			else
				++i;
		}
		return succeeded;
	}

	// Clear the cards in the hand.
	clearCards() {
		this.cards.fill(null);
		this.cards.fill(false);
		return true;
	}

	getFullHand() {
		return this.cards;
	}

	getVisibleHand() {
		var result = [];
		var len = this.cards.length;
		for (let i = 0; i < len; ++i) {
			if (this.faceups[i])
				result[i] = this.cards[i];
			else
				result[i] = null;
		}

		return result;
	}
}

// Takes the hand and community cards and finds the best hand that can be constructed from them.
// Must be passed the arrays within them (this is because some game modes might want to make adjustments)
// The actual scoring logic occurs in the 'score' function.
class ScoredHand {
	constructor(hole, community) {
		this.score = 0;
		this.holePicks = 0; // These two variables essentially behave as bitmasks.
		this.commPicks = 0;

		this.score(hole, community);
	}

	// TODO: Finish this function
	score(hole, community) {
		var flushes = [];
		var straight = 0;
		var strFlush = 0;
		var fullHouse = 0;
		var best4ofaKind = -1;
		var best3ofaKind = -1;
		var bestPair = -1;
		var nextPair = -1;
		var highest = Array(5).fill(-1);

		// Note that card face values are stored as ONE LESS than their actual value elsewhere.
		var suits = Array(4).fill(0); // suit values work as the indices here
		var suitsVals = Array(4).fill("").map(() => []); // makes an array of empty arrays

		// The ordering of these arrays is A 2 3 4 5 ... 10 J Q K A
		var values = Array(14).fill(0);
		var valuesSuits = Array(14).fill("").map(() => []); // same deal as before

		var cards = [hole, community];

		var len = 0;
		var cardval = 0;
		var currCard = null;

		// Catalog card type frequencies
		for (var h = 0; h < 2; ++h) { // for both sets of cards
			len = cards[h].length;

			for (let i = 0; i < len; ++i) { // record suit and value of each card.
				currCard = cards[h][i];
				if (currCard !== null) {
					if (currCard.isAce()) { // aces are recorded in two places
						++values[0]; ++values[13];
						valuesSuits[0][valuesSuits[0].length] = currCard.getSuit;
						valuesSuits[13][valuesSuits[13].length] = currCard.getSuit;
					} else {
						cardval = currCard.getValue - 1;
						++values[cardval];
						valuesSuits[cardval][valuesSuits[cardval].length] = currCard.getSuit;
					}

					cardval = currCard.getSuit;
					++suits[cardval];
					suitsVals[cardval][suitsVals[cardval].length] = currCard.getValue - 1;
				}
			}
		}

		// Now to find what kind of hand the player actually has
		// Regular Flushes
		for (let i = 0; i < 4; ++i) {
			if (suits[i] >= 5)
				flushes[flushes.length] = i;
		}

		// Straights & straight flushes
		var valcount = 0;
		var seenSuits = Array(4).fill(false);
		var straightSuits = Array(4).fill(0); // named this way because it's used in straight flush detect

		for (let i = 0; i < 14; ++i) {
			if (values[i] > 0)
				++valcount;
			else
				valcount = 0;

			// track flushes occurring in straights
			len = valuesSuits[i].length;
			seenSuits.fill(false);

			// this iterates through valuesSuits...
			for (let j = 0; j < len; ++j)
				++seenSuits[valuesSuits[i][j]];
			// and THIS iterates through seenSuits.
			for (let j = 0; j < 4; ++j) {
				if (seenSuits[j] > 0)
					++straightSuits[j];
				else
					straightSuits[j] = 0;

				if (straightSuits[j] >= 5)
					strFlush = i;
			}

			if (valcount >= 5)
				straight = i;
		}

		// This can probably be piled into the other for loop at some point, but do be wary that
		// this one starts at ONE and NOT ZERO. This is to make sure that the low Ace entry is ignored.
		// Identify 4 of a kinds, 3 of a kinds, pairs, and highest cards

		// DO REMEMEMBER that regular flushes need to generate their own 'kicker list', and that
		// the highest kicker might actually be in bestPair or best3ofaKind.

		var amount = 0;
		for (let i = 1; i < 14; ++i) {
			amount = values[i];

			switch (amount) {
				case 4:
					// a check just in case there are more than 7 cards available to make a hand from
					if (best4ofaKind > highest[0]) {
						highest[0] = best4ofaKind;
					}
					best4ofaKind = i;
					break;

				case 3:
					// If there's multiple 3-kinds, demote lower to pair
					if (best3ofaKind > bestPair)
						bestPair = best3ofaKind;
					best3ofaKind = i;
					break;

				case 2: // pair
					// If there's a 3 pair and 3rd pair has next highest card, use that as a kicker
					if (nextPair > highest[0])
						highest[0] = nextPair;
					nextPair = bestPair;
					bestPair = i;
					break;

				case 1:
					for (let j = 4; j > 0; --j) {
						highest[j] = highest[j - 1];
					}
					highest[0] = i;
					break;

				default: // if there are no cards of this value at all, we have nothing to do here.
					break;
			}
		}

		// Time to actually calculate the score and which cards are being used for the hand.
		// Note that card face values are one lower at this point than listed on the card.

		var tempScore = 0;
		var tempKicker = 0;
		if (strFlush) {
			tempScore = C_STR_FLUSH;
			tempScore += (strFlush - O_STRAIGHT) * C_STRAIGHT; // StrFlush rank is stored in Straight slot.
		}
		else if (best4ofaKind >= 0) {
			tempScore = best4ofaKind * C_4_KIND;
			tempKicker = highest[0];

			// These next two checks make sure the kicker used is actually the highest available.
			if (best3ofaKind > tempKicker)
				tempKicker = best3ofaKind;
			if (bestPair > tempKicker)
				tempKicker = bestPair;

			tempScore += (tempKicker - O_FACEVALUE) * C_KICKERS[0];
		}
		else if (best3ofaKind >= 0 && bestPair >= 0) { // full house
			tempScore = 2 * C_FH_FLUSH; // 2 = full house, 1 = flush
			tempScore += best3ofaKind * C_3_KIND;
			tempScore += bestPair * C_BEST_PAIR;
		}
		else if (flushes.length != 0) {
			// There's a flush! Time for complex stuff!
			tempScore = 1 * C_FH_FLUSH; // 2 = full house, 1 = flush
			let suitScores = Array(4).fill(0);

			// Calculate the possible kicker scores so we can choose the highest one.
			for (let i = 0; i < 4; ++i) {
				suitsVals[i].sort(function(a, b){return b - a});
				if (suits[i] >= 5) {
					for (let j = 0; j < 5; ++j) {
						suitScores[i] += (suitsVals[i][j] - O_FACEVALUE) * C_KICKERS[i];
					}
				}
			}
			suitScores.sort(function(a, b){return b - a});
			tempScore += suitScores[0];
		}
		else if (straight > 0) {
			tempScore = (straight - O_STRAIGHT) * C_STRAIGHT;
		}
		else if (best3ofaKind >= 0) {
			tempScore = best3ofaKind * C_3_KIND;
		}
		else if (bestPair >= 0) { // Pair or two pair
			tempScore = bestPair * C_BEST_PAIR;
			if (nextPair >= 0) { // two pair
				tempScore += nextPair * C_NEXT_PAIR;
				tempScore += (highest[0] - O_FACEVALUE) * C_KICKERS[0];
			} else { // one pair. This needs 3 kicker cards.
				for (let i = 0; i < 3; ++i)
					tempScore += (highest[i] - O_FACEVALUE) * C_KICKERS[i];
			}
		}
		else { // Resorting to all kickers (High card)
			len = highest.length;
			for (let i = 0; i < len; ++i)
				tempScore += (highest[i] - O_FACEVALUE) * C_KICKERS[i];
		}

		this.score = tempScore;
	}
}

// Contains a set of 52 cards that get referenced by other stuff. This is used to generate card deals
// The "free" array tracks which cards are actually in play so that duplicates do not occur.
// A value of true indicates that a card is still in the deck, whereas a value of false indicates that
// the card has been dealt somewhere already.
// "count" indicates how many cards are still in the deck and able to be dealt.
class Deck {
	constructor() {
		this.cards = [];
		this.dealt = 0;

		// Generate all 52 cards of the poker deck and add them to the the deck.
		for (var i = 0; i < 52; ++i) 
			this.cards[i] = new Card((i % 13) + 2, Math.floor(i / 13));

		// Shuffle the deck so that the 
		this.shuffle();
	}

	// Deal a card, assuming the deck is already shuffled.
	deal() {
		// Because this is POSTFIX the value BEFORE INCREMENTING is used for array access!
		return this.cards[this.dealt++];
	}

	// Shuffle the cards of the deck using Fischer-Yates shuffle.
	shuffle() {
		var temp = null;
		var j = 0;
		var n = this.cards.length;
		for (let i = 0; i < n - 2; ++i) {
			j = Math.floor(Math.random() * (n - i)) + i;
			temp = this.cards[i];
			this.cards[i] = this.cards[j];
			this.cards[j] = temp;
		}

		this.dealt = 0;

		return true;
	}

	// Reset deck so a new round can be started.
	// Currently just an alias for shuffle function.
	reset() {
		return this.shuffle();
	}
}

// This class represents the player's possessions on the board.
// chips represents how much money the player has.
// bet represents how much the player is betting on the current round.
// cards is the player's hand.
// mode is the player's relation to the game:
// 0 for spectating
// 1 for playing (normal)
// 2 for playing (folded)

// There is also mouse position values in case this is represented in the UI, but for now
// they are just dummy variables.
class Player {
	constructor(name, chips, mode) {
		this.name = name;
		this.chips = chips;
		this.bet = 0;
		this.cards = new Hand();
		this.mode = mode;
		this.mousex = 0;
		this.mousey = 0;
	}

	// This function is used to *increase* the player's bet, for the purposes of blinds, calls, and raises.
	// The amount fed in is the amount to increase the bet by.
	bet(amount) {
		if (this.chips < amount) {
			this.bet = this.chips;
			this.chips = 0;
		} else {
			this.bet += amount;
			this.chips -= amount;
		}

		return this.bet;
	}

	// Used to award wins to a player
	addChips(amount) {
		this.chips += amount;
		return true;
	}

	// Give a card to the player so they can add it to their hand.
	addCard(toAdd, isFaceUp) {
		return this.cards.addCard(toAdd, isFaceUp);
	}

	// Used to reset the player's current bet and hand after a round is over.
	reset() {
		this.cards.clearCards();
		this.bet = 0;
		if (this.mode != 0)
			this.mode = 1;

		return this.mode;
	}

	updateMousePos(newX, newY) {
		this.mousex = newX;
		this.mousey = newY;
	}

	get nick() {
		return this.name;
	}

	// Used to determine if this player should still be able to bet and recieve cards this round.
	get stillIn() {
		return (this.mode == 1);
	}

	// Used to determine if the player isn't a spectator.
	get isPlaying() {
		return (this.mode > 0);
	}
}


// This class handles most of the actual poker action.
// 'rules' should be an object with a bunch of functions in it that can be called to determine
// things that occur in-game that may vary between poker variants.
class Table {
	constructor(deck, startChips) {
		this.deck = deck;
		this.players = Array(12).fill(null);
		this.idToPlayer = {};
		this.playerCount = 0;
		this.pot = 0;
		this.startChips = startChips;
		this.inProgress = false;
		this.betCount = 0; // How many players are still in the hand.
		this.inputWaiting = false;
	}

	// Clean up stuff after the round is over and prepare for a new round.
	// This does not handle things like awarding chips or determinining who goes first next round.
	cleanup() {
		this.deck.shuffle();
		this.pot = 0;

		int len = this.players.length;
		for (let i = 0; i < len; i++) {
			this.players[i].reset();
		}

		this.betCount = this.playerCount;

		return true;
	}

	// Deal cards to the *players*
	dealCards(isFaceUp, firstRecipient) {
		var len = this.players.length;
		var i = 0;
		var curr = null;
		for (i = firstRecipient + 1; i < len; ++i) {
			curr = this.players[i];
			if (curr.stillIn)
				curr.addCard(this.deck.deal(), isFaceUp);
		}
		for (i = 0; i <= firstRecipient; ++i) {
			curr = this.players[i];
			if (curr.stillIn)
				curr.addCard(this.deck.deal(), isFaceUp);
		}
	}

	

}

class TexasTable extends Table {
	constructor(deck, startChips) {
		super(deck, startChips);
		this.button = 0;
	}

}