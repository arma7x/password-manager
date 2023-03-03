<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  const MAX_LENGTH = 10;

  export let className: string;
  export let passcode: string = '';

  let index: number = 0;
  let passcodeInputRef: any;
  let visible: boolean = false;

  export function toggleVisibility() {
    visible = !visible;
    return visible;
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

<div class="{className} passcode-container">
  <input type="password" bind:this={passcodeInputRef} bind:value="{passcode}" maxlength={MAX_LENGTH}/>
  <div class="row">
    {#each Array(10) as _, index }
      <div class="char">{passcode[index] != null ? (visible ? passcode[index] : '*') : '_'}</div>
    {/each}
  </div>
</div>

<style>
  .passcode-container {
    position: relative;
    background-color: #ffffff;
  }
  .passcode-container > input {
    width: 0px;
    height: 0px;
    position: absolute;
    top: 0;
    left: 0;
  }
  .passcode-container > .row {
    width: 200px;
    position: absolute;
    top: 0;
    z-index: 9;
    padding-left: 5px;
    background-color: #ffffff;
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
    text-align: center;
    align-items: center;
    justify-content: center;
    margin-right: 5px;
    font-size: 15px;
    font-weight: bold;
    border: 1px solid var(--themeColor);
    padding: 3px 0px;
    box-sizing: border-box;
    border-radius: 2px;
    color: var(--themeColor);
  }
  .passcode-container.focus {
    background-color: var(--themeColor);
  }
  .passcode-container.focus > input {}
  .passcode-container.focus > .row {
    background-color: var(--themeColor);
  }
  .passcode-container.focus > .row > .char {
    border: 1px solid #fff;
    color: #ffffff;
  }
</style>
