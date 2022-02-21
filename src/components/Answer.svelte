<script>

    export let answerText;
    export let checkAnswerHandler;

</script>

<style>

    button {
background-color: #4CAF50;
  border: none;
  color: white;
  padding: 15px 32px;
  margin-left: 5px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 14px;
    }

</style>

<main>

    <button on:click={() => checkAnswerHandler(answerText)}>
        {answerText}
    </button>

</main>