<script>
	import Question from './components/Question.svelte';
	import Answer from './components/Answer.svelte';
	import Points from './components/Points.svelte';
	import WrongPoints from './components/WrongPoints.svelte';
	import Category from './components/Category.svelte';


let points = 0;
let  wrongpoints = 0;
let category = 0;
let currentQuiz = 0;

const quiz = [
	{
		id: 1,
		category: 'Category 1',
		question: 'A sneeze is faster than an eye blink?',
		correctAnswer: 0,
		answer: [
			'True',
			'False'
		]
	},
	{
		id: 2,
		category: 'Category 2',
		question: 'Panda says OINK?',
		correctAnswer: 1,
		answer: [
			'True',
			'False'
		]
	},
	{
		id: 3,
		category: 'Category 3',
		question: 'A sneeze is faster than cars on the freeway?',
		correctAnswer: 0,
		answer: [
			'True',
			'False'
		]
	},
	{
		id: 4,
		category: 'Category 1',
		question: 'John F. Kennedy is on the $2 bill?',
		correctAnswer: 1,
		answer: [
			'True',
			'False'
		]
	},
	{
		id: 5,
		category: 'Category 2',
		question: 'Olympic gold medal is made of silver?',
		correctAnswer: 0,
		answer: [
			'True',
			'False'
		]
	},
	{
		id: 6,
		category: 'Category 3',
		question: 'Chocolate is lethal to dogs?',
		correctAnswer: 0,
		answer: [
			'Yes',
			'No'
		]
	},

]


function checkAnswerHandler(answerText) {
	const isCorrect = quiz[currentQuiz].answer.indexOf(answerText) === quiz[currentQuiz].correctAnswer;
	if (isCorrect) {
		points += 1;
		quiz[currentQuiz].question = 'Correct!';
	} else {
		wrongpoints += 1;
		quiz[currentQuiz].question = 'incorrect';
	}
	setTimeout(function() {
		currentQuiz += 1;
	}, 1000);
}


</script>

<style>
		
		main {
			margin: auto;
			padding: 45px;
			width: 50%;
			border: 1px solid black;
		}
		h1{
			text-decoration: underline;
		}

		.points{
			display: flex;
			font-size: 50px;
		}

		.answers{
			display: flex;
		}
	
</style>


<main>

	<Category category={quiz[currentQuiz].category} />


	<h1>Trivia Questions</h1>
	<p>Answer True or False and test your knowledge. If get more than 5 correct, you are a pro</p>
	
	<div class="points">
		<Points {points} />
		<WrongPoints {wrongpoints} />
	</div>
	
		<Question questionText={quiz[currentQuiz].question}/>
		<div class="answers">
			<Answer answerText={quiz[currentQuiz].answer[0]} checkAnswerHandler={checkAnswerHandler} />
			<Answer answerText={quiz[currentQuiz].answer[1]} checkAnswerHandler={checkAnswerHandler} />
		</div>



</main>
