<script setup>

import { computed, reactive, ref, watch } from 'vue'
import { translate } from '../services/youdao/index.js'
import { speechAPI } from '../services/openai/index.js'

const sentence = reactive({
  text: '',
  audio_text: '',
  audio_src: '',
  loading: false
})
const words = reactive([
  {
    text: '',
    phonetic: '',
    explains: [{ first: '', last: '' }],
    audio: null
  }
])

const wordCache = reactive(new Set(JSON.parse(localStorage.getItem('word_cache') || '[]')))

function getWordFromCache(word) {
  if (!wordCache.has(word)) return null
  const cache = JSON.parse(localStorage.getItem('word:' + word) || '{}')
  const audio = new Audio()
  audio.src = cache.audio_src
  cache.audio = audio
  return cache
}

function addWordCache(word) {
  if (wordCache.has(word.text)) return
  wordCache.add(word.text)
  word.audio_src = word.audio.src
  localStorage.setItem('word:' + word.text, JSON.stringify(word))
  localStorage.setItem('word_cache', JSON.stringify(Array.from(wordCache)))
}

const wordCacheData = computed(() => {
  const wordData = []
  for (let w of wordCache) {
    const word = getWordFromCache(w)
    wordData.push(word)
  }
  return wordData
})

let settings = reactive({
  openai_api_key: '',
  openai_api_base_url: 'https://api.openai.com',
  youdao_app_id: '',
  youdao_app_secret: '',
  speech_rate: 0.5
})
const settingsFromLocal = JSON.parse(localStorage.getItem('settings') || '{}')
for (let k in settingsFromLocal) settings[k] = settingsFromLocal[k]

watch(() => settings, () => {
  localStorage.setItem('settings', JSON.stringify(settings))
}, { deep: true })

function search() {
  speechSentence()
  splitAndTranslateWords()
}

function speechSentence() {
  if (sentence.text !== sentence.audio_text) {
    sentence.loading = true
    speechAPI(
      settings.openai_api_base_url,
      settings.openai_api_key,
      sentence.text,
      settings.speech_rate
    ).then(res => {
      sentence.audio_src = window.URL.createObjectURL(new Blob([res]))
      sentence.audio_text = sentence.text
      sentence.loading = false
    })
  }
}

async function splitAndTranslateWords() {
  words.splice(0, words.length)
  for (let w of sentence.text.split(' ')) {
    if (!w.length) continue
    const word = reactive({ text: w, phonetic: '', audio: null })
    words.push(word)
    translateWord(word)
  }
}

function translateWord(word) {
  const cache = getWordFromCache(word.text)
  if (cache) {
    for (let k in cache)
      word[k] = cache[k]
  } else {
    translate(
      settings.youdao_app_id,
      settings.youdao_app_secret,
      word.text
    ).then(res => {
      if (res['errorCode'] === '0' && res['isWord']) {
        word.phonetic = res['basic']['us-phonetic']
        // explains
        let explains = []
        for (let exp of res['basic']['explains']) {
          const arr = exp.split(' ')
          explains.push({
            first: arr.shift(),
            last: arr.join(' ')
          })
        }
        word.explains = explains
        // audio
        const audio = new Audio()
        audio.src = res['basic']['us-speech']
        word.audio = audio
        addWordCache(word)
      }
    })
  }
}

async function speechWord(word) {
  if (word.audio) {
    try {
      await word.audio.play()
    } catch (e) {
      speechSynthesis.speak(new SpeechSynthesisUtterance(word.text))
    }
  } else speechSynthesis.speak(new SpeechSynthesisUtterance(word.text))
}

const showSettingsModal = ref(false)
const showHistoryModal = ref(false)

function showSettings() {
  showSettingsModal.value = true
  showHistoryModal.value = false
}

function showHistory() {
  showSettingsModal.value = false
  showHistoryModal.value = true
}
</script>

<template>
  <div id="index">
    <div class="sentence-form">
      <a-textarea
        v-model="sentence.text"
        placeholder="Enter your text"
        allow-clear
        auto-size
        @keyup.ctrl.enter="search"
      />
      <div
        class="sentence-form-btn"
        @click="search"
        v-show="sentence?.text?.length"
      >
        <icon-command v-if="!sentence.loading" />
        <icon-loading v-else />
      </div>
    </div>
    <div class="sentence-view">
      <div
        class="sentence-view-word"
        v-for="(word, i) in words"
        :key="i"
        @click="speechWord(word)"
      >
        <a-trigger
          trigger="click"
          position="top"
          :unmount-on-close="false"
          content-class="sentence-view-word-trigger"
        >
          <a-typography-title :heading="3">
            {{ word.text }}
          </a-typography-title>
          <template #content>
            <div class="sentence-view-word-explains" v-if="word.explains">
              <div
                v-for="explain in word.explains"
                :key="explain"
                class="sentence-view-word-explain"
              >
                <div class="sentence-view-word-explain-first">{{ explain.first }}</div>
                <div class="sentence-view-word-explain-last">{{ explain.last }}</div>
              </div>
            </div>
            <div class="sentence-view-word-explains" v-else>
              <a-typography-text type="secondary">
                the word query failed
              </a-typography-text>
            </div>
          </template>
        </a-trigger>
        <div class="sentence-view-word-phonetic">
          {{ word.phonetic }}
        </div>
      </div>
    </div>
    <div class="sentence-footer">
      <div class="sentence-footer-btns">
        <button class="sentence-footer-btn" @click="showSettings">
          <icon-settings :size="16" />
        </button>
        <button class="sentence-footer-btn" @click="showHistory">
          <icon-history :size="16" />
        </button>
      </div>
      <audio
        controls
        :src="sentence?.audio_src"
        v-if="sentence?.audio_src?.length"
      ></audio>
    </div>

    <a-modal
      v-model:visible="showSettingsModal"
      cancel-text="Cancel"
      ok-text="Confirm"
    >
      <template #title>
        <div class="modal-title" style="width: 100%">
          <icon-settings />
          Settings
        </div>
      </template>
      <div class="settings-form">
        <div class="settings-form-item">
          <div class="settings-form-item-label">OpenAI API Key</div>
          <a-input v-model="settings.openai_api_key" />
        </div>
        <div class="settings-form-item">
          <div class="settings-form-item-label">OpenAI API Base URL</div>
          <a-input v-model="settings.openai_api_base_url" />
        </div>
        <div class="settings-form-item">
          <div class="settings-form-item-label">Youdao App ID</div>
          <a-input v-model="settings.youdao_app_id" />
        </div>
        <div class="settings-form-item">
          <div class="settings-form-item-label">Youdao App Secret</div>
          <a-input v-model="settings.youdao_app_secret" />
        </div>
        <div class="settings-form-item">
          <div class="settings-form-item-label">Speech Rate</div>
          <a-slider
            v-model="settings.speech_rate"
            :default-value="5"
            :style="{ width: '300px' }"
            :max="2"
            :min="0.2"
            :step="0.1"
            :marks="{ 0.5: '0.5', 1: '1', 1.5: '1.5', 2: '2' }"
            show-input
          />
        </div>
      </div>
    </a-modal>
    <a-modal
      v-model:visible="showHistoryModal"
      cancel-text="Cancel"
      ok-text="Confirm"
      :footer="false"
    >
      <template #title>
        <div class="modal-title" style="width: 100%">
          <icon-history />
          History
        </div>
      </template>
      <a-list hoverable>
        <a-list-item
          v-for="word in wordCacheData"
          :key="word"
          @click="speechWord(word)"
          @dblclick="speechWord(word)"
          class="history-list"
        >
          <div class="history-word">
            <div class="history-word-text">
              {{ word.text }}
            </div>
            <div class="history-word-phonetic">
              {{ word.phonetic }}
            </div>
          </div>
        </a-list-item>
      </a-list>
    </a-modal>
  </div>
</template>

<style scoped lang="less">
#index {
  max-width: 1200px;
  width: 90%;
  margin: auto;
  padding: 20px 0;
  min-height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .sentence-form {
    display: flex;
    gap: 5px;
    align-items: center;
    background-color: var(--color-secondary);
    padding: 4px 12px 4px 0;
    border-radius: 5px;

    .arco-textarea-wrapper {
      background-color: transparent;
      border-color: transparent;
    }

    .sentence-form-btn {
      width: 1.5em;
      height: 1.5em;
      display: flex;
      justify-content: center;
      align-items: center;

      border-radius: 5px;
      background-color: var(--color-neutral-3);
    }
  }

  .sentence-view {
    display: flex;
    gap: .2em;
    justify-content: center;
    flex-flow: wrap;

    .sentence-view-word {
      display: flex;
      flex-direction: column;
      align-items: center;

      .arco-typography {
        margin-top: 16px;
        margin-bottom: 8px;
        padding: 3px 8px;
        border-radius: 12px;
        transition: background-color .2s ease;
      }

      .arco-typography:hover {
        cursor: pointer;
        background-color: var(--color-neutral-1);
      }

      .sentence-view-word-phonetic {
        color: var(--color-text-2);
      }
    }
  }

  .sentence-footer {
    display: flex;
    justify-content: center;
    gap: 8px;

    .sentence-footer-btns {
      display: flex;
      height: 48px;
      border-radius: 27px;
      background-color: var(--color-neutral-2);
      padding: 3px;

      .sentence-footer-btn {
        height: 48px;
        width: 48px;
        border-radius: 24px;
        border: none;
        background-color: transparent;
        transition: background-color .2s ease;
      }

      .sentence-footer-btn:hover {
        background-color: var(--color-bg-2);
      }
    }

    audio {
      width: 100%;
      height: 54px;
    }
  }
}
</style>

<style>
.sentence-view-word-trigger {
  background-color: transparent;
  border-color: transparent;
  padding: 20px;
  display: flex;
  justify-content: center;

  .sentence-view-word-explains {
    max-width: calc(100% - 40px);
    padding: 12px 20px;
    border-radius: 18px;
    background-color: var(--color-neutral-1);
    border: 3px solid var(--color-border-2);
    display: flex;
    flex-direction: column;
    gap: 5px;

    .sentence-view-word-explain {
      display: flex;
      max-width: 40em;

      .sentence-view-word-explain-first {
        display: block;
        width: 36px;
        color: var(--color-text-3);
        font-family: Georgia, serif;
        font-style: italic;
      }

      .sentence-view-word-explain-last {
        max-width: calc(100% - 36px);
      }
    }
  }
}

.arco-modal {
  max-width: 90%;
  border-radius: 12px;

  .arco-modal-header {
    border-bottom: none;
    border-top-right-radius: 12px;
    border-top-left-radius: 12px;
    background-color: #fbfbfc;
  }

  .arco-modal-footer {
    border-top: none;

    .arco-btn {
      border-radius: 8px;
      content: 'hello';
    }
  }

  .modal-title {
    width: 100%;
  }

  .settings-form {
    display: flex;
    flex-direction: column;
    gap: 10px;

    .settings-form-item {
      display: flex;
      flex-direction: column;
      gap: 5px;

      .settings-form-item-label {
        font-size: 12px;
        color: var(--color-text-3);
      }

      .arco-input-wrapper {
        padding-top: 1px;
        padding-bottom: 2px;
      }

      .arco-slider {
        padding: 0;
      }
    }
  }

  .history-word {
    display: flex;
    justify-content: space-between;

    .history-word-phonetic {
      color: var(--color-text-3);
    }
  }
}
</style>