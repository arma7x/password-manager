<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  const MAX_LENGTH = 10;

  export let className: string;
  export let passcode: string = '';
  export let placeholder: string = 'PIN CODE';

  let parent: any;
  let index: number = 0;
  let passcodeInputRef: any;

  export function getPasscode(): string {
    return passcode.join('');
  }

  function onKeyDownUp(evt) {
    if (['ArrowLeft', 'ArrowRight'].indexOf(evt.key) > -1) {
      evt.preventDefault();
      evt.stopPropagation();
    }
  }

  function focusInput() {
    passcodeInputRef.focus();
    setTimeout(() => {
      passcodeInputRef.selectionStart = passcodeInputRef.selectionEnd = passcodeInputRef.value.length;
    }, 50);
  }

  onMount(() => {
    setTimeout(() => {
      if (passcodeInputRef.value != null && passcodeInputRef.value !== '') {
        focusInput();
      }
      passcodeInputRef.addEventListener("keydown", onKeyDownUp);
      passcodeInputRef.addEventListener("keyup", onKeyDownUp);
    }, 300);
  });

</script>

<div bind:this={parent} class="{className} passcode-container">
  <input type="password" bind:this={passcodeInputRef} bind:value="{passcode}" maxlength={MAX_LENGTH}/>
  <div class="row">
    {#each Array(10) as _, index }
      <div class="char">{passcode[index] != null ? passcode[index] : '_'}</div>
    {/each}
  </div>
</div>

<style>
  .passcode-container {
    position: relative;
    ackground-color: var(--themeColor);
  }
  .passcode-container > input {
    width: 0px;
    height: 0px;
    position: absolute;
    top: 0;
    left: 0;
  }
  .passcode-container > .row {
    position: absolute;
    top: 0;
    z-index: 9;
    padding-left: 5px;
    background-color: var(--themeColor);
    position: relative;
    height: 40px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
  }
  .passcode-container > .row > .char {
    width: 18px;
    height: 30px;
    align-items: center;
    justify-content: center;
    margin-right: 5px;
    font-size: 15px;
    font-weight: bold;
    border: 1px solid #fff;
    padding: 3px 0px;
    box-sizing: border-box;
    border-radius: 2px;
    color: #ffffff;
  }
</style>
