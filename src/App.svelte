<script lang="ts">
  import { Router, Route, Link } from 'svelte-navigator';
  import { AppBar, SoftwareKey } from './components/index.ts';
  import { Welcome } from './routes/index.ts';
  import { onMount, onDestroy } from 'svelte';
  import { Localization } from './utils/localization.ts';

  export let localization = new Localization('en-US', 'langs');
  export let appBar;
  export let softwareKey;

  export const getAppProp = () => {
    return {appBar, softwareKey, localization};
  }

  onMount(() => {
    document.addEventListener('visibilitychange', (evt) => {
      if (document.visibilityState === 'hidden') {
        window.close();
      }
    });
  });

</script>

<Router>
  <div id="kai-status-bar"></div>
  <AppBar bind:this={appBar} />
  <main>
    <Route primary={false} path="index.html" let:location let:navigate>
      <svelte:component this="{Welcome}" {location} {navigate} {getAppProp}/>
    </Route>
    <Route primary={false} path="/" let:location let:navigate>
      <svelte:component this="{Welcome}" {location} {navigate} {getAppProp}/>
    </Route>
  </main>
  <SoftwareKey bind:this={softwareKey} />
</Router>

<style>
  #kai-status-bar {
    height: 26px;
    width: 100%;
    background-color: var(--themeColor);
  }
  main {
    display: flex;
    top: 54px;
    margin: 0px;
    padding: 0px;
    position: fixed;
    text-align: center;
    width: 100%;
    height: calc(100% - 84px);
    overflow: scroll;
  }
  :global(._toastItem) {
    text-align: center!important;
  }
</style>
