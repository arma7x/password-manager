<script lang="ts">
  import { Router, Route, Link } from 'svelte-navigator';
  import { AppBar, SoftwareKey } from './components/index.ts';
  import { Welcome, Demo, Room } from './routes/index.ts';
  import { onMount, onDestroy } from 'svelte';
  import { Localization } from './utils/localization.ts';

  export let localization = new Localization('en-US', 'langs');
  export let appBar;
  export let softwareKey;

  export const getAppProp = () => {
    return {appBar, softwareKey, localization};
  }

  onMount(() => {
    console.log('onMount', 'App');
    navigator.mozSetMessageHandler('activity', (activityRequest) => {
      window['_activityRequest_'] = activityRequest;
      window['_option_'] = window['_activityRequest_'].source;
      if (window['_option_'].name === "voice-input") {
        window['_activityRequest_'].postResult("Activity received by consumer.");
        window['_activityRequest_'].close();
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
    <Route primary={false} path="demo" let:location let:navigate>
      <svelte:component this="{Demo}" {location} {navigate} {getAppProp}/>
    </Route>
    <Route primary={false} path="room" let:location let:navigate>
      <svelte:component this="{Room}" {location} {navigate} {getAppProp}/>
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
