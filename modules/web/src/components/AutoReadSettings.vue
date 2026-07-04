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
            <span class="less" @click="lessAutoReadSpeed">
              <em class="iconfont">&#xe625;</em>
            </span>
            <b></b>
            <span class="lang">{{ autoReadSpeed }}</span>
            <b></b>
            <span class="more" @click="moreAutoReadSpeed">
              <em class="iconfont">&#xe626;</em>
            </span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import '../assets/fonts/iconfont.css'
import settings from '../config/themeConfig'

const store = useBookStore()

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
const moreAutoReadSpeed = () => {
  if (store.config.autoScrollSpeed < 200) store.config.autoScrollSpeed += 1
}
const lessAutoReadSpeed = () => {
  if (store.config.autoScrollSpeed > 1) store.config.autoScrollSpeed -= 1
}
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
      display: inline-block;
      width: 274px;
      height: 34px;
      vertical-align: middle;
      border-radius: 2px;

      span {
        display: inline-block;
        width: 89px;
        height: 34px;
        line-height: 34px;
        text-align: center;
        vertical-align: middle;
        cursor: pointer;

        em {
          font-style: normal;
        }
      }

      .less:hover,
      .more:hover {
        color: #ed4259;
      }

      .lang {
        color: #a6a6a6;
        font-weight: 400;
        font-family: FZZCYSK;
      }

      b {
        display: inline-block;
        height: 20px;
        vertical-align: middle;
      }
    }
  }
}

.night {
  .option-item {
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
  .option-item {
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

.option-item:hover {
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
    }
  }
}
</style>
