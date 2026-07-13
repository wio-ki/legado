<template>
  <div
    class="auto-read-wrapper"
    :style="popupTheme"
    :class="{ night: isNight, day: !isNight }"
  >
    <div class="auto-read-title">自动阅读</div>
    <div class="auto-read-list">
      <ul>
        <li class="option-row">
          <i>自动阅读</i>
          <span
            class="option-item"
            :class="{ selected: autoReadActive === false }"
            @click="setAutoReadActive(false)"
            >关</span
          >
          <span
            class="option-item"
            :class="{ selected: autoReadActive === true }"
            @click="setAutoReadActive(true)"
            >开</span
          >
        </li>
        <li class="option-row">
          <i>阅读方式</i>
          <span
            class="option-item option-item-wide"
            :class="{ selected: autoReadMode === 'page' }"
            @click="setAutoReadMode('page')"
            >左右翻页</span
          >
          <span
            class="option-item option-item-wide"
            :class="{ selected: autoReadMode === 'scroll' }"
            @click="setAutoReadMode('scroll')"
            >上下滚屏</span
          >
        </li>
        <li class="speed-row">
          <i>阅读速度</i>
          <div class="resize">
            <button
              class="less"
              type="button"
              aria-label="减小阅读速度"
              @pointerdown="startContinuousSpeedAdjustment(-1)"
              @pointerup="stopContinuousSpeedAdjustment"
              @pointerleave="stopContinuousSpeedAdjustment"
              @pointercancel="stopContinuousSpeedAdjustment"
              @click="handleSpeedButtonClick(-1)"
            >
              <em class="iconfont">&#xe625;</em>
            </button>
            <b></b>
            <input
              class="speed-input"
              type="number"
              inputmode="numeric"
              min="1"
              max="200"
              :value="autoReadSpeed"
              aria-label="阅读速度"
              @blur="confirmAutoReadSpeed"
              @keydown="handleSpeedInputKeydown"
            />
            <b></b>
            <button
              class="more"
              type="button"
              aria-label="增大阅读速度"
              @pointerdown="startContinuousSpeedAdjustment(1)"
              @pointerup="stopContinuousSpeedAdjustment"
              @pointerleave="stopContinuousSpeedAdjustment"
              @pointercancel="stopContinuousSpeedAdjustment"
              @click="handleSpeedButtonClick(1)"
            >
              <em class="iconfont">&#xe626;</em>
            </button>
          </div>
        </li>
        <li class="speed-preset-row">
          <i>快捷档位</i>
          <div class="speed-preset-list">
            <button
              v-for="preset in speedPresets"
              :key="preset.speed"
              class="speed-preset"
              :class="{ selected: autoReadSpeed === preset.speed }"
              type="button"
              @click="setAutoReadSpeed(preset.speed)"
            >
              {{ preset.label }} {{ preset.speed }}
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import '../assets/fonts/iconfont.css'
import settings from '../config/themeConfig'
import API from '@api'

const store = useBookStore()
const MIN_AUTO_READ_SPEED = 1
const MAX_AUTO_READ_SPEED = 200
const CONTINUOUS_ADJUSTMENT_DELAY = 350
const CONTINUOUS_ADJUSTMENT_INTERVAL = 100
const speedPresets = [
  { label: '一档', speed: 45 },
  { label: '二档', speed: 55 },
  { label: '三档', speed: 65 },
  { label: '四档', speed: 75 },
] as const

let continuousAdjustmentTimer: number | undefined
let continuousAdjustmentInterval: number | undefined
let didStartContinuousAdjustment = false
let speedChangedDuringContinuousAdjustment = false

const theme = computed(() => store.theme)
const isNight = computed(() => store.isNight)
const popupTheme = computed(() => {
  return {
    background: settings.themes[theme.value].popup,
  }
})

const autoReadActive = computed(() => {
  return store.autoScrollActive
})
const setAutoReadActive = (active: boolean) => {
  store.setAutoScrollActive(active)
}

const autoReadMode = computed(() => {
  return store.config.autoReadMode === 'page' ? 'page' : 'scroll'
})
const setAutoReadMode = (mode: 'page' | 'scroll') => {
  store.config.autoReadMode = mode
  store.config.autoScrollDirection = 'down'
}

const autoReadSpeed = computed(() => {
  return store.config.autoScrollSpeed
})
const persistAutoReadSpeed = () => {
  void API.saveReadConfig(store.config).catch(() => undefined)
}

const setAutoReadSpeed = (value: number | string, persist = true) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return false

  const speed = Math.min(
    MAX_AUTO_READ_SPEED,
    Math.max(MIN_AUTO_READ_SPEED, Math.round(numericValue)),
  )
  if (speed === store.config.autoScrollSpeed) return false

  store.config.autoScrollSpeed = speed
  if (persist) persistAutoReadSpeed()
  return true
}

const adjustAutoReadSpeed = (amount: number, persist = true) => {
  return setAutoReadSpeed(store.config.autoScrollSpeed + amount, persist)
}

const clearContinuousSpeedAdjustment = () => {
  if (continuousAdjustmentTimer !== undefined) {
    window.clearTimeout(continuousAdjustmentTimer)
    continuousAdjustmentTimer = undefined
  }
  if (continuousAdjustmentInterval !== undefined) {
    window.clearInterval(continuousAdjustmentInterval)
    continuousAdjustmentInterval = undefined
  }
}

const startContinuousSpeedAdjustment = (amount: number) => {
  clearContinuousSpeedAdjustment()
  didStartContinuousAdjustment = false
  speedChangedDuringContinuousAdjustment = false
  continuousAdjustmentTimer = window.setTimeout(() => {
    didStartContinuousAdjustment = true
    speedChangedDuringContinuousAdjustment = adjustAutoReadSpeed(amount, false)
    continuousAdjustmentInterval = window.setInterval(() => {
      speedChangedDuringContinuousAdjustment =
        adjustAutoReadSpeed(amount, false) ||
        speedChangedDuringContinuousAdjustment
    }, CONTINUOUS_ADJUSTMENT_INTERVAL)
  }, CONTINUOUS_ADJUSTMENT_DELAY)
}

const stopContinuousSpeedAdjustment = () => {
  clearContinuousSpeedAdjustment()
  if (speedChangedDuringContinuousAdjustment) {
    persistAutoReadSpeed()
    speedChangedDuringContinuousAdjustment = false
  }
}

const handleSpeedButtonClick = (amount: number) => {
  if (!didStartContinuousAdjustment) {
    adjustAutoReadSpeed(amount)
  }
  didStartContinuousAdjustment = false
}

const confirmAutoReadSpeed = (event: FocusEvent) => {
  const input = event.currentTarget as HTMLInputElement
  setAutoReadSpeed(input.value)
  input.value = String(autoReadSpeed.value)
}

const handleSpeedInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    ;(event.currentTarget as HTMLInputElement).blur()
  }
}

onBeforeUnmount(stopContinuousSpeedAdjustment)
</script>

<style lang="scss" scoped>
:deep(.iconfont) {
  font-family: iconfont;
  font-style: normal;
}

.auto-read-wrapper {
  user-select: none;
  margin: -13px;
  padding: 28px 24px 26px;
  min-width: 296px;
  text-align: left;
  background: #ede7da url('../assets/imgs/themes/popup_1.png') repeat;

  .auto-read-title {
    margin-bottom: 22px;
    font-size: 18px;
    line-height: 22px;
    font-family: FZZCYSK;
    font-weight: 400;
  }

  .auto-read-list {
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li + li {
      margin-top: 24px;
    }

    i {
      display: inline-block;
      min-width: 60px;
      margin-right: 16px;
      vertical-align: middle;
      color: #666;
      font:
        12px / 16px PingFangSC-Regular,
        '-apple-system',
        Simsun;
    }

    .option-item {
      display: inline-block;
      width: 78px;
      height: 34px;
      margin-right: 16px;
      border-radius: 2px;
      text-align: center;
      vertical-align: middle;
      cursor: pointer;
      font:
        14px / 34px PingFangSC-Regular,
        HelveticaNeue-Light,
        'Helvetica Neue Light',
        'Microsoft YaHei',
        sans-serif;
    }

    .option-item-wide {
      width: 98px;
    }

    .resize {
      display: inline-flex;
      align-items: center;
      width: 274px;
      height: 34px;
      vertical-align: middle;
      border-radius: 2px;

      button,
      .speed-input {
        box-sizing: border-box;
        flex: 1;
        width: 89px;
        height: 34px;
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        line-height: 34px;
        text-align: center;
        vertical-align: middle;
        cursor: pointer;
      }

      button {
        touch-action: manipulation;

        em {
          font-style: normal;
        }
      }

      .less:hover,
      .more:hover {
        color: #ed4259;
      }

      .speed-input {
        color: #a6a6a6;
        font-weight: 400;
        font-family: FZZCYSK;
        outline: none;
        appearance: textfield;

        &:focus {
          color: inherit;
          box-shadow: inset 0 0 0 1px #ed4259;
        }

        &::-webkit-inner-spin-button,
        &::-webkit-outer-spin-button {
          margin: 0;
          appearance: none;
        }
      }

      b {
        display: inline-block;
        height: 20px;
        vertical-align: middle;
      }
    }

    .speed-preset-list {
      display: inline-flex;
      gap: 8px;
      vertical-align: middle;
    }

    .speed-preset {
      box-sizing: border-box;
      width: 62px;
      height: 34px;
      padding: 0;
      border-radius: 2px;
      text-align: center;
      cursor: pointer;
      font:
        12px / 34px PingFangSC-Regular,
        HelveticaNeue-Light,
        'Helvetica Neue Light',
        'Microsoft YaHei',
        sans-serif;
    }
  }
}

.night {
  .option-item,
  .speed-preset {
    border: 1px solid #666;
    background: rgba(45, 45, 45, 0.5);
  }

  .selected {
    color: #ed4259;
    border: 1px solid #ed4259;
  }

  .resize {
    border: 1px solid #666;
    background: rgba(45, 45, 45, 0.5);

    b {
      border-right: 1px solid #666;
    }
  }
}

.day {
  .option-item,
  .speed-preset {
    background: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  .selected {
    color: #ed4259;
    border: 1px solid #ed4259;
  }

  .resize {
    border: 1px solid #e5e5e5;
    background: rgba(255, 255, 255, 0.5);

    b {
      border-right: 1px solid #e5e5e5;
    }
  }
}

.option-item:hover,
.speed-preset:hover {
  color: #ed4259;
  border: 1px solid #ed4259;
}

@media screen and (max-width: 500px) {
  .auto-read-wrapper {
    min-width: auto;
    padding: 24px 18px 22px;

    .auto-read-list {
      i {
        display: flex;
        flex-wrap: wrap;
        padding-bottom: 5px;
      }

      .option-item {
        margin-right: 12px;
      }

      .option-item-wide {
        width: 92px;
      }

      .resize {
        width: 100%;
      }

      .speed-preset-list {
        display: flex;
        width: 100%;
      }

      .speed-preset {
        flex: 1;
        width: auto;
      }
    }
  }
}
</style>
