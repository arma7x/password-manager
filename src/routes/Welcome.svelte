<script lang="ts">
  import { Route, navigate as goto } from "svelte-navigator";
  import { createKaiNavigator } from '../utils/navigation.ts';
  import { onMount, onDestroy } from 'svelte';
  import SetupPasscode from '../SetupPasscode.svelte';
  import RequiredPasscode from '../RequiredPasscode.svelte';
  import AddOrUpdateVault from '../AddOrUpdateVault.svelte';
  import * as WebCryptoVault from '../utils/WebCryptoVault.ts';
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
    softwareKey.setText({ left: 'Menu', center: '', right: 'Options' });
  } else {
    const { softwareKey } = getAppProp();
    softwareKey.setText({ left: 'Menu', center: '', right: '' });
  }

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
      //const navClasses = document.getElementsByClassName(navClass);
      //if (navClasses[this.verticalNavIndex] != null) {
        //navClasses[this.verticalNavIndex].click();
      //}
    },
    backspaceListener: function(evt) {
      window.close();
    }
  };

  let navInstance = createKaiNavigator(navOptions);

  onMount(async () => {
    console.log('onMount', name);
    const { appBar, softwareKey } = getAppProp();
    appBar.setTitleText(name);
    softwareKey.setText({ left: 'Menu', center: '', right: '' });
    navInstance.attachListener();
    const hashedPasscode = await WebCryptoVault.getPasswordHash()
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
    console.log('onDestroy', name);
    navInstance.detachListener();
  });

  async function openVault(data: any) {
    const hashedPasscode = await WebCryptoVault.getPasswordHash()
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
            const privateKey = await WebCryptoVault.convertJWKToRSAKey(JSON.parse(await WebCryptoVault.aesDecrypt(await WebCryptoVault.getEncryptedPrivateKey(), _passcode)));
            let chunks: Array<string> = [];
            for (let i=0;i<data.encrypted.length;i++) {
              const decrypted = await WebCryptoVault.rsaDecrypt(privateKey, data.encrypted[i]);
              chunks.push(decrypted);
            }
            openVaultModal({
              key: data.key,
              alias: data.alias,
              name: data.name,
              data: chunks.join(''),
            });
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
    let publicKey = await WebCryptoVault.convertJWKToRSAKey(await WebCryptoVault.getPublicKey());
    if (publicKey != null) {
      collections = await WebCryptoVault.getAllPasswordVault();
      focusCursorToFirst();
    }
  }

  function openLSKMenu() {
    lskMenu = new OptionMenu({
      target: document.body,
      props: {
        title: 'Menu',
        focusIndex: 0,
        options: [
          { title: 'Add new vault', subtitle: 'Insert new sensitive data into vault' },
          { title: 'HARD RESET!', subtitle: 'Clear passcode, encryption key and all vault' },
        ],
        softKeyCenterText: 'select',
        onSoftkeyRight: (evt, scope) => {},
        onSoftkeyLeft: (evt, scope) => {},
        onEnter: async (evt, scope) => {
          lskMenu.$destroy();
          if (scope.index == 0) {
            openVaultModal();
          } else if (scope.index == 1) {
            await WebCryptoVault.dbAppConfig.clear();
            await WebCryptoVault.dbPasswordVault.clear();
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
            openVault({key, ...collections[key]})
          } else if (scope.index == 1) {
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
            await WebCryptoVault.removeFromPasswordVault(key);
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
    <ListView className="{navClass}" title="{collections[key].alias}" subtitle="{collections[key].name}" onClick={() => openVault({key, ...collections[key]})}/>
  {/each}
</main>

<style>
  #welcome-screen {
    overflow: scroll;
    width: 100%;
  }
</style>
