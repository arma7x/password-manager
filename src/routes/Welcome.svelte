<script lang="ts">
  import { Route, navigate as goto } from "svelte-navigator";
  import { createKaiNavigator } from '../utils/navigation.ts';
  import { onMount, onDestroy } from 'svelte';
  import SetupPasscode from '../modals/SetupPasscode.svelte';
  import RequiredPasscode from '../modals/RequiredPasscode.svelte';
  import AddOrUpdateVault from '../modals/AddOrUpdateVault.svelte';
  import { type RawVault, type EncryptedVaultRow, OpenVaultCallback, getPasswordHash, convertJWKToRSAKey, aesDecrypt, getEncryptedPrivateKey, rsaDecrypt, getPublicKey, getAllPasswordVault, dbAppConfig, dbPasswordVault, removeFromPasswordVault } from '../utils/WebCryptoVault.ts';
  import { Toast, Toaster, ListView, OptionMenu, Dialog } from '../components/index.ts';

  export let location: any;
  export let navigate: any;
  export let getAppProp: Function;

  const navClass = "welcomeNavClass";

  let name: string = 'Password Manager';

  let passcodeModal: SetupPasscode | RequiredPasscode;
  let collections: any = {};

  $: if (Object.keys(collections).length > 0) {
    const { softwareKey } = getAppProp();
    if (window['_activityRequest_'] != null)
      softwareKey.setText({ left: '', center: 'EXPORT', right: '' });
    else
      softwareKey.setText({ left: 'Menu', center: '+', right: 'Options' });
  } else {
    const { softwareKey } = getAppProp();
    if (window['_activityRequest_'] != null)
      softwareKey.setText({ left: '', center: 'EMPTY', right: '' });
    else
      softwareKey.setText({ left: 'Menu', center: '+', right: '' });
  }

  let exportVaultMenu: OptionMenu;
  let lskMenu: OptionMenu;
  let rskMenu: OptionMenu;
  let dialog: Dialog;
  let addOrUpdateVaultModal: AddOrUpdateVault;

  let navOptions = {
    verticalNavClass: navClass,
    softkeyLeftListener: function(evt) {
      openLSKMenu();
    },
    softkeyRightListener: function(evt) {
      openRSKMenu();
    },
    enterListener: function(evt) {
      if (window['_activityRequest_'] == null) {
        openVaultModal();
      } else {
        const navClasses = document.getElementsByClassName(navClass);
        if (navClasses[this.verticalNavIndex] != null) {
          navClasses[this.verticalNavIndex].click();
        }
      }
    },
    backspaceListener: function(evt) {
      window.close();
    }
  };

  let navInstance = createKaiNavigator(navOptions);

  onMount(async () => {
    navigator.mozSetMessageHandler('activity', (activityRequest) => {
      window['_activityRequest_'] = activityRequest;
      window['_option_'] = window['_activityRequest_'].source;
      if (window['_option_'].name === "voice-input") {}
    });
    const { appBar, softwareKey } = getAppProp();
    appBar.setTitleText(name);
    softwareKey.setText({ left: 'Menu', center: '', right: '' });
    navInstance.attachListener();
    const hashedPasscode = await getPasswordHash()
    if (hashedPasscode == null) {
      passcodeModal = new SetupPasscode({
        target: document.body,
        props: {
          title: 'Setup Passcode',
          onSuccess: (_passcode: string) => {
            passcodeModal.$destroy();
          },
          onError: (err: any) => {
            toastMessage(err.toString());
          },
          onOpened: () => {
            navInstance.detachListener();
          },
          onClosed: () => {
            navInstance.attachListener();
            passcodeModal = null;
          }
        }
      });
    } else {
      passcodeModal = new RequiredPasscode({
        target: document.body,
        props: {
          title: 'Passcode Required!',
          hashedPasscode: hashedPasscode,
          canMinimize: false,
          onSuccess: (_passcode: string) => {
            passcodeModal.$destroy();
            if (_passcode != null) {
              getCollections();
            }
          },
          onError: (err: any) => {
            toastMessage(err.toString());
          },
          onOpened: () => {
            navInstance.detachListener();
          },
          onClosed: () => {
            navInstance.attachListener();
            passcodeModal = null;
          }
        }
      });
    }
  });

  onDestroy(() => {
    navInstance.detachListener();
  });

  function openVaultUpdateCallback(data: RawVault) {
    openVaultModal(data);
  }

  function openVaultExportCallback(data: RawVault) {
    if (window['_activityRequest_'] != null) {
      window['_activityRequest_'].postResult(data.data);
      window['_activityRequest_'].close();
    }
  }

  async function openVault(data: EncryptedVaultRow, callback: OpenVaultCallback) {
    const hashedPasscode = await getPasswordHash()
    if (hashedPasscode == null)
      return;
    passcodeModal = new RequiredPasscode({
      target: document.body,
      props: {
        title: 'Passcode Required!',
        hashedPasscode: hashedPasscode,
        canMinimize: true,
        onSuccess: async (_passcode: string) => {
          passcodeModal.$destroy();
          if (_passcode != null) {
            const privateKey = await convertJWKToRSAKey(JSON.parse(await aesDecrypt(await getEncryptedPrivateKey(), _passcode)));
            let chunks: Array<string> = [];
            for (let i=0;i<data.encrypted.length;i++) {
              const decrypted = await rsaDecrypt(privateKey, data.encrypted[i]);
              chunks.push(decrypted);
            }
            callback({ key: data.key, alias: data.alias, name: data.name, data: chunks.join('') });
          }
        },
        onError: (err: any) => {
          toastMessage(err.toString());
        },
        onOpened: () => {
          navInstance.detachListener();
        },
        onClosed: () => {
          navInstance.attachListener();
          passcodeModal = null;
        }
      }
    });
  }

  function focusCursorToFirst() {
    navInstance.verticalNavIndex = 0;
    setTimeout(() => {
      navInstance.navigateListNav(0);
      setTimeout(() => {
        const cursor = document.getElementsByClassName(navClass)[navInstance.verticalNavIndex];
        if (cursor) {
          cursor.classList.add('focus');
        }
      }, 150)
    }, 150);
  }

  async function getCollections() {
    let publicKey = await convertJWKToRSAKey(await getPublicKey());
    if (publicKey != null) {
      const { softwareKey } = getAppProp();
      collections = await getAllPasswordVault();
      if (Object.keys(collections).length > 0) {
        if (window['_activityRequest_'] != null)
          softwareKey.setText({ left: '', center: 'EXPORT', right: '' });
        else
          softwareKey.setText({ left: 'Menu', center: '+', right: 'Options' });
      } else {
        if (window['_activityRequest_'] != null)
          softwareKey.setText({ left: '', center: 'EMPTY', right: '' });
        else
          softwareKey.setText({ left: 'Menu', center: '+', right: '' });
      }
      focusCursorToFirst();
    }
  }

  function openLSKMenu() {
    if (window['_activityRequest_'] != null)
      return;
    lskMenu = new OptionMenu({
      target: document.body,
      props: {
        title: 'Menu',
        focusIndex: 0,
        options: [
          { title: 'Change passcode', subtitle: 'Change app passcode' }, // TODO
          { title: 'FAQ', subtitle: 'Frequently Asked Questions' }, // TODO
          { title: 'Disclaimer Notice', subtitle: 'Notice of app usage' },  // TODO
          { title: 'Hard Reset', subtitle: 'Clear passcode, encryption keys and all vaults' },
          { title: 'Exit', subtitle: 'Close app' },
        ],
        softKeyCenterText: 'select',
        onSoftkeyRight: (evt, scope) => {},
        onSoftkeyLeft: (evt, scope) => {},
        onEnter: async (evt, scope) => {
          lskMenu.$destroy();
          if (scope.index == 0) {

          } else if (scope.index == 3) {
            await dbAppConfig.clear();
            await dbPasswordVault.clear();
          } else if (scope.index == 4) {
            window.close();
          }
        },
        onBackspace: (evt, scope) => {
          evt.preventDefault();
          evt.stopPropagation();
          lskMenu.$destroy();
        },
        onOpened: () => {
          navInstance.detachListener();
        },
        onClosed: (scope) => {
          navInstance.attachListener();
          lskMenu = null;
        }
      }
    });
  }

  function openRSKMenu() {
    if (window['_activityRequest_'] != null)
      return;
    if (Object.keys(collections).length === 0)
      return;
    rskMenu = new OptionMenu({
      target: document.body,
      props: {
        title: 'Vault Options',
        focusIndex: 0,
        options: [
          { title: 'Update', subtitle: 'Update data inside vault storage' },
          { title: 'Generate QR-Code', subtitle: 'Generate qr-code contain(only sensitive data)' },
          { title: 'Remove', subtitle: 'Remove from vault storage' },
        ],
        softKeyCenterText: 'select',
        onSoftkeyRight: (evt, scope) => {},
        onSoftkeyLeft: (evt, scope) => {},
        onEnter: async (evt, scope) => {
          rskMenu.$destroy();
          if (scope.index == 0) {
            const key = Object.keys(collections)[navInstance.verticalNavIndex];
            openVault({key, ...collections[key]}, openVaultUpdateCallback);
          } else if (scope.index == 1) {
            // TODO
            console.log(collections[Object.keys(collections)[navInstance.verticalNavIndex]]);
          } else if (scope.index == 2) {
            removeVault(Object.keys(collections)[navInstance.verticalNavIndex]);
          }
        },
        onBackspace: (evt, scope) => {
          evt.preventDefault();
          evt.stopPropagation();
          rskMenu.$destroy();
        },
        onOpened: () => {
          navInstance.detachListener();
        },
        onClosed: (scope) => {
          navInstance.attachListener();
          rskMenu = null;
        }
      }
    });
  }

  function exportVault(data) {
    if (window['_activityRequest_'] == null)
      return;
    exportVaultMenu = new OptionMenu({
      target: document.body,
      props: {
        title: 'Select',
        focusIndex: 0,
        options: [
          { title: 'Alias', subtitle: `${data.alias}` },
          { title: 'Name', subtitle: `${data.name}` },
          { title: 'Data', subtitle: 'Export sensitive data' },
        ],
        softKeyCenterText: 'select',
        onSoftkeyRight: (evt, scope) => {},
        onSoftkeyLeft: (evt, scope) => {},
        onEnter: async (evt, scope) => {
          exportVaultMenu.$destroy();
          if (scope.index == 0) {
            window['_activityRequest_'].postResult(data.alias);
            window['_activityRequest_'].close();
          } else if (scope.index == 1) {
            window['_activityRequest_'].postResult(data.name);
            window['_activityRequest_'].close();
          } else if (scope.index == 2) {
            const key = Object.keys(collections)[navInstance.verticalNavIndex];
            openVault({key, ...collections[key]}, openVaultExportCallback);
          }
        },
        onBackspace: (evt, scope) => {
          evt.preventDefault();
          evt.stopPropagation();
          exportVaultMenu.$destroy();
        },
        onOpened: () => {
          navInstance.detachListener();
        },
        onClosed: (scope) => {
          navInstance.attachListener();
          exportVaultMenu = null;
        }
      }
    });
  }

  function openVaultModal(update: Object | null) {
    addOrUpdateVaultModal = new AddOrUpdateVault({
      target: document.body,
      props: {
        title: update != null ? 'Update' : 'Add',
        id: update != null ? update.key : null,
        alias: update != null ? update.alias : "",
        name: update != null ? update.name : "",
        data: update != null ? update.data : "",
        onSuccess: async (data: Promise<any>) => {
          const result = await data;
          if (result != null) {
            collections[result.key] = result.data;
            if (Object.keys(collections).length === 1) {
              focusCursorToFirst();
            }
          }
          addOrUpdateVaultModal.$destroy();
        },
        onError: (err: any) => {
          toastMessage(err.toString());
        },
        onOpened: () => {
          navInstance.detachListener();
        },
        onClosed: () => {
          navInstance.attachListener();
          addOrUpdateVaultModal = null;
        }
      }
    });
  }

  function removeVault(key: string) {
    const vault = collections[Object.keys(collections)[navInstance.verticalNavIndex]];
    dialog = new Dialog({
      target: document.body,
      props: {
        title: 'Confirmation',
        body: `Are sure to remove ${vault.alias}?`,
        softKeyCenterText: '',
        softKeyLeftText: 'Cancel',
        softKeyRightText: 'Yes',
        onSoftkeyLeft: (evt) => {
          dialog.$destroy();
        },
        onSoftkeyRight: async (evt) => {
          try {
            const key = Object.keys(collections)[navInstance.verticalNavIndex];
            await removeFromPasswordVault(key);
            delete collections[key];
            collections = {...collections};
            if (Object.keys(collections).length === 1) {
              focusCursorToFirst();
            } else if (navInstance.verticalNavIndex >= Object.keys(collections).length -1) {
              navInstance.navigateListNav(-1);
            }
            dialog.$destroy();
          } catch (err) {}
        },
        onEnter: (evt) => {},
        onBackspace: (evt) => {
          evt.preventDefault();
          evt.stopPropagation();
          dialog.$destroy();
        },
        onOpened: () => {
          navInstance.detachListener();
        },
        onClosed: () => {
          navInstance.attachListener();
          dialog = null;
        }
      }
    });
  }

  function toastMessage(text) {
    const t = new Toast({
      target: document.body,
      props: {
        options: {}
      }
    })
    Toaster.push(text , {
      dismissable: false,
      intro: { y: -64 },
      duration: 2000,
      onpop: () => {
        setTimeout(() => {
          t.$destroy();
        }, 4000);
      }
    })
  }

</script>

<main id="welcome-screen" data-pad-top="28" data-pad-bottom="30">
  {#each Object.keys(collections) as key }
    <ListView className="{navClass}" title="{collections[key].alias}" subtitle="{collections[key].name}" onClick={() => exportVault({key, ...collections[key]})}/>
  {/each}
</main>

<style>
  #welcome-screen {
    overflow: scroll;
    width: 100%;
  }
</style>
