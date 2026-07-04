<template>
  <div
    class="chapter-wrapper"
    :style="bodyTheme"
    :class="{ night: isNight, day: !isNight }"
    @click="showToolBar = !showToolBar"
  >
    <div class="tool-bar" :style="leftBarTheme">
      <div class="tools">
        <el-popover
          :placement="desktopPopoverPlacement"
          :width="catalogPopupWidth"
          trigger="click"
          :show-arrow="false"
          v-model:visible="popCataVisible"
          :popper-class="catalogPopoverClass"
        >
          <PopCatalog @getContent="getContent" class="popup" />
          <template #reference>
            <div class="tool-icon" :class="{ 'no-point': false }">
              <div class="iconfont">&#58905;</div>
              <div class="icon-text">目录</div>
            </div>
          </template>
        </el-popover>
        <el-popover
          :placement="desktopPopoverPlacement"
          :width="settingsPopupWidth"
          trigger="click"
          :show-arrow="false"
          v-model:visible="readSettingsVisible"
          :popper-class="settingsPopoverClass"
        >
          <read-settings class="popup" />
          <template #reference>
            <div class="tool-icon" :class="{ 'no-point': noPoint }">
              <div class="iconfont">&#58971;</div>
              <div class="icon-text">设置</div>
            </div>
          </template>
        </el-popover>
        <div class="tool-icon" @click="toShelf">
          <div class="iconfont">&#58892;</div>
          <div class="icon-text">书架</div>
        </div>
        <div class="tool-icon" :class="{ 'no-point': noPoint }" @click="toTop">
          <div class="iconfont">&#58914;</div>
          <div class="icon-text">顶部</div>
        </div>
        <div
          class="tool-icon"
          :class="{ 'no-point': noPoint }"
          @click="toBottom"
        >
          <div class="iconfont">&#58915;</div>
          <div class="icon-text">底部</div>
        </div>
      </div>
    </div>
    <div class="read-bar" :style="rightBarTheme">
      <div class="tools">
        <el-popover
          :placement="autoReadPopoverPlacement"
          :width="autoReadPopupWidth"
          trigger="click"
          :show-arrow="false"
          v-model:visible="autoReadVisible"
          :popper-class="autoReadPopoverClass"
        >
          <auto-read-settings class="popup" />
          <template #reference>
            <div class="tool-icon auto-read-tool" :class="{ 'no-point': noPoint }">
              <div class="auto-read-badge">AUTO</div>
              <div class="icon-text">自动阅读</div>
            </div>
          </template>
        </el-popover>
        <div
          class="tool-icon"
          :class="{ 'no-point': noPoint }"
          @click="toPreChapter"
        >
          <div class="iconfont">&#58920;</div>
          <span v-if="miniInterface">上一章</span>
        </div>
        <div
          class="tool-icon"
          :class="{ 'no-point': noPoint }"
          @click="toNextChapter"
        >
          <span v-if="miniInterface">下一章</span>
          <div class="iconfont">&#58913;</div>
        </div>
      </div>
    </div>
    <div class="chapter-bar"></div>
    <div class="chapter" ref="content" :style="chapterTheme">
      <div
        v-if="showAutoReadIndicator"
        class="auto-read-indicator"
        :style="autoReadIndicatorStyle"
      ></div>
      <div class="content">
        <div class="top-bar" ref="top"></div>
        <div
          v-for="data in chapterData"
          :key="data.index"
          :chapterIndex="data.index"
          ref="chapter"
        >
          <chapter-content
            ref="chapterRef"
            :chapterIndex="data.index"
            :contents="data.content"
            :title="data.title"
            :spacing="store.config.spacing"
            :fontSize="fontSize"
            :fontFamily="fontFamily"
            @readedLengthChange="onReadedLengthChange"
            v-if="showContent"
          />
        </div>
        <div class="loading" ref="loading"></div>
        <div class="bottom-bar" ref="bottom"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import jump from '@/plugins/jump'
import settings from '@/config/themeConfig'
import API from '@api'
import { useLoading } from '@/hooks/loading'
import { useThrottleFn } from '@vueuse/shared'
import { isNullOrBlank } from '@/utils/utils'

const content = ref()
// loading spinner
const { isLoading, loadingWrapper } = useLoading(content, '正在获取信息')
const store = useBookStore()

const {
  catalog,
  popCataVisible,
  readSettingsVisible,
  autoReadVisible,
  miniInterface,
  showContent,
  bookProgress,
  theme,
  isNight,
  autoScrollActive,
} = storeToRefs(store)

const chapterPos = computed({
  get: () => store.readingBook.chapterPos,
  set: value => (store.readingBook.chapterPos = value),
})
const chapterIndex = computed({
  get: () => store.readingBook.chapterIndex,
  set: value => (store.readingBook.chapterIndex = value),
})
const isSeachBook = computed({
  get: () => store.readingBook.isSeachBook,
  set: value => (store.readingBook.isSeachBook = value),
})

// 当前阅读书籍readingBook持久化
watch(
  () => store.readingBook,
  book => {
    // 保存localStorage
    // localStorage.setItem(book.bookUrl, JSON.stringify(book));
    // 最近阅读
    localStorage.setItem('readingRecent', JSON.stringify(book))
    //保存 sessionStorage
    sessionStorage.setItem('chapterIndex', book.chapterIndex.toString())
    sessionStorage.setItem('chapterPos', book.chapterPos.toString())
  },
  { deep: 1 },
)

// 无限滚动
const infiniteLoading = computed(() => store.config.infiniteLoading)
let scrollObserver: IntersectionObserver | null
const loading = ref()
watchEffect(() => {
  if (!infiniteLoading.value) {
    scrollObserver?.disconnect()
  } else {
    scrollObserver?.observe(loading.value)
  }
})
const loadMore = () => {
  const index = chapterData.value.slice(-1)[0].index
  if (catalog.value.length - 1 > index) {
    getContent(index + 1, false)
    store.saveBookProgress() // 保存的是上一章的进度，不是预载的本章进度
  }
}
// IntersectionObserver回调 底部加载
const onReachBottom = (entries: IntersectionObserverEntry[]) => {
  if (isLoading.value) return
  for (const { isIntersecting } of entries) {
    if (!isIntersecting) return
    loadMore()
  }
}

// 字体
const fontFamily = computed(() => {
  if (store.config.font >= 0) {
    return settings.fonts[store.config.font]
  }
  return store.config.customFontName
})
const fontSize = computed(() => {
  return store.config.fontSize + 'px'
})

// 主题部分
const bodyColor = computed(() => settings.themes[theme.value].body)
const chapterColor = computed(() => settings.themes[theme.value].content)
const popupColor = computed(() => settings.themes[theme.value].popup)

const readWidth = computed(() => {
  if (!miniInterface.value) {
    return store.config.readWidth - 130 + 'px'
  } else {
    return window.innerWidth + 'px'
  }
})
const popupWidth = computed(() => {
  if (!miniInterface.value) {
    return store.config.readWidth - 33
  } else {
    return window.innerWidth - 33
  }
})
const desktopPopoverPlacement = computed(() => {
  return miniInterface.value ? 'right' : 'left-start'
})
const autoReadPopoverPlacement = computed(() => {
  return miniInterface.value ? 'top' : 'left-start'
})
const catalogPopupWidth = computed(() => {
  if (miniInterface.value) {
    return popupWidth.value
  }
  return Math.min(popupWidth.value, 560)
})
const settingsPopupWidth = computed(() => {
  if (miniInterface.value) {
    return popupWidth.value
  }
  return Math.min(popupWidth.value, 520)
})
const autoReadPopupWidth = computed(() => {
  if (miniInterface.value) {
    return Math.min(popupWidth.value, 360)
  }
  return 360
})
const catalogPopoverClass = computed(() => {
  return miniInterface.value ? 'pop-cata pop-cata-mobile' : 'pop-cata pop-cata-desktop'
})
const settingsPopoverClass = computed(() => {
  return miniInterface.value
    ? 'pop-setting pop-setting-mobile'
    : 'pop-setting pop-setting-desktop'
})
const autoReadPopoverClass = computed(() => {
  return miniInterface.value
    ? 'pop-autoread pop-autoread-mobile'
    : 'pop-autoread pop-autoread-desktop'
})
const bodyTheme = computed(() => {
  return {
    background: bodyColor.value,
  }
})
const chapterTheme = computed(() => {
  return {
    background: chapterColor.value,
    width: readWidth.value,
  }
})
const showToolBar = ref(false)
const leftBarTheme = computed(() => {
  return {
    background: popupColor.value,
    marginRight: miniInterface.value
      ? 0
      : -(store.config.readWidth / 2 + 68) + 'px',
    display: miniInterface.value && !showToolBar.value ? 'none' : 'block',
  }
})
const rightBarTheme = computed(() => {
  return {
    background: popupColor.value,
    marginRight: miniInterface.value
      ? 0
      : -(store.config.readWidth / 2 + 68) + 'px',
    display: miniInterface.value && !showToolBar.value ? 'none' : 'block',
  }
})

const getScrollElement = () => {
  return document.scrollingElement || document.documentElement
}

/**
 * pc移动端判断 最大阅读宽度修正
 * 阅读宽度最小为640px 加上工具栏 68px 52px 取较大值 为 776px
 */
const onResize = () => {
  store.setMiniInterface(window.innerWidth < 776)
  const width = store.config.readWidth /**包含padding */
  checkPageWidth(width)
}
/** 判断阅读宽度是否超出页面或者低于默认值640 */
const checkPageWidth = (readWidth: number) => {
  if (store.miniInterface) return
  if (readWidth < 640) store.config.readWidth = 640
  if (readWidth + 2 * 68 > window.innerWidth) store.config.readWidth -= 160
}
watch(
  () => store.config.readWidth,
  width => checkPageWidth(width),
)
// 顶部底部跳转
const top = ref()
const bottom = ref()
const toTop = () => {
  jump(top.value)
}
const toBottom = () => {
  jump(bottom.value)
}

// 书架路由切换
const router = useRouter()
const toShelf = () => {
  router.push('/')
}

// 获取章节内容
const chapterData = ref<{ index: number; content: string[]; title: string }[]>(
  [],
)
const noPoint = ref(true)
let autoScrollFrame = 0
let autoScrollLastTime: number | null = null
let autoReadJumping = false
let manualChapterAutoAdvancing = false
let lastScrollTop = 0
const autoReadIndicatorOffset = ref(0)
const autoReadMode = computed(() => {
  return store.config.autoReadMode === 'page' ? 'page' : 'scroll'
})
const showAutoReadIndicator = computed(() => {
  return (
    store.autoScrollActive &&
    autoReadMode.value === 'page' &&
    !noPoint.value &&
    !isLoading.value
  )
})
const autoReadIndicatorStyle = computed(() => {
  return {
    top: `${Math.max(0, autoReadIndicatorOffset.value)}px`,
    width: miniInterface.value ? 'calc(100vw - 40px)' : readWidth.value,
    left: miniInterface.value ? '20px' : '50%',
    transform: miniInterface.value ? 'none' : 'translateX(-50%)',
  }
})
const clearAutoScrollFrame = () => {
  if (autoScrollFrame !== 0) {
    cancelAnimationFrame(autoScrollFrame)
    autoScrollFrame = 0
  }
}
const resetAutoReadIndicator = () => {
  autoReadIndicatorOffset.value = 0
  autoReadJumping = false
}
const syncLastScrollTop = () => {
  lastScrollTop = getScrollElement().scrollTop
}
const stopAutoScroll = (message?: string, syncState = true) => {
  clearAutoScrollFrame()
  autoScrollLastTime = null
  resetAutoReadIndicator()
  if (syncState && store.autoScrollActive) {
    store.setAutoScrollActive(false)
  }
  if (message) {
    ElMessage.info(message)
  }
}
const getLastLoadedChapterIndex = () => {
  return chapterData.value.slice(-1)[0]?.index ?? chapterIndex.value
}
const scheduleAutoScrollFrame = () => {
  autoScrollFrame = requestAnimationFrame(runAutoScroll)
}
const toNextChapterByAutoRead = () => {
  const nextIndex = chapterIndex.value + 1
  if (typeof catalog.value[nextIndex] === 'undefined') {
    return false
  }
  store.setContentLoading(true)
  getContent(nextIndex)
  store.saveBookProgress()
  return true
}
const runPageAutoRead = (timestamp: number) => {
  const scrollElement = getScrollElement()
  if (autoScrollLastTime === null) {
    autoScrollLastTime = timestamp
  }
  const elapsedSeconds = (timestamp - autoScrollLastTime) / 1000
  autoScrollLastTime = timestamp
  if (elapsedSeconds <= 0) {
    scheduleAutoScrollFrame()
    return
  }
  const maxIndicatorOffset = Math.max(scrollElement.clientHeight - 2, 1)
  autoReadIndicatorOffset.value = Math.min(
    maxIndicatorOffset,
    autoReadIndicatorOffset.value + store.config.autoScrollSpeed * elapsedSeconds,
  )
  if (autoReadIndicatorOffset.value >= maxIndicatorOffset) {
    const maxScrollTop = Math.max(
      0,
      scrollElement.scrollHeight - scrollElement.clientHeight,
    )
    const remaining = Math.max(0, maxScrollTop - scrollElement.scrollTop)
    if (remaining <= 1) {
      if (!toNextChapterByAutoRead()) {
        stopAutoScroll('已到达最后内容，自动阅读已停止')
      } else {
        autoScrollLastTime = null
        resetAutoReadIndicator()
        scheduleAutoScrollFrame()
      }
      return
    }
    autoReadJumping = true
    clearAutoScrollFrame()
    autoScrollLastTime = null
    const jumpDistance = Math.min(
      remaining,
      Math.max(scrollElement.clientHeight - 100, 0),
    )
    if (jumpDistance <= 0) {
      autoReadJumping = false
      stopAutoScroll('已到达最后内容，自动阅读已停止')
      return
    }
    canJump = false
    jump(jumpDistance, {
      duration: store.config.jumpDuration,
      callback: () => {
        canJump = true
        autoReadJumping = false
        autoReadIndicatorOffset.value = 0
        if (store.autoScrollActive) {
          scheduleAutoScrollFrame()
        }
      },
    })
    return
  }
  scheduleAutoScrollFrame()
}
const runScrollAutoRead = (timestamp: number) => {
  const scrollElement = getScrollElement()
  if (autoScrollLastTime === null) {
    autoScrollLastTime = timestamp
  }
  const elapsedSeconds = (timestamp - autoScrollLastTime) / 1000
  autoScrollLastTime = timestamp
  if (elapsedSeconds <= 0) {
    scheduleAutoScrollFrame()
    return
  }
  const maxScrollTop = Math.max(
    0,
    scrollElement.scrollHeight - scrollElement.clientHeight,
  )
  const nextTop = Math.min(
    maxScrollTop,
    Math.max(0, scrollElement.scrollTop + store.config.autoScrollSpeed * elapsedSeconds),
  )
  window.scrollTo(0, nextTop)
  const isAtBottom = maxScrollTop - scrollElement.scrollTop <= 1
  if (isAtBottom) {
    const hasMoreChapters = catalog.value.length - 1 > getLastLoadedChapterIndex()
    if (!infiniteLoading.value) {
      if (!toNextChapterByAutoRead()) {
        stopAutoScroll('已到达最后内容，自动阅读已停止')
      } else {
        autoScrollLastTime = null
        scheduleAutoScrollFrame()
      }
      return
    }
    if (!hasMoreChapters) {
      stopAutoScroll('已到达最后内容，自动阅读已停止')
      return
    }
  }
  scheduleAutoScrollFrame()
}
const runAutoScroll = (timestamp: number) => {
  if (!store.autoScrollActive) {
    stopAutoScroll(undefined, false)
    return
  }
  if (
    document.visibilityState === 'hidden' ||
    noPoint.value ||
    isLoading.value ||
    autoReadJumping
  ) {
    autoScrollLastTime = timestamp
    scheduleAutoScrollFrame()
    return
  }
  if (autoReadMode.value === 'page') {
    runPageAutoRead(timestamp)
    return
  }
  autoReadIndicatorOffset.value = 0
  runScrollAutoRead(timestamp)
}
const startAutoScroll = () => {
  clearAutoScrollFrame()
  autoScrollLastTime = null
  resetAutoReadIndicator()
  scheduleAutoScrollFrame()
}
watch(autoScrollActive, active => {
  if (active) {
    startAutoScroll()
  } else {
    stopAutoScroll(undefined, false)
  }
})
watch(autoReadMode, () => {
  autoScrollLastTime = null
  resetAutoReadIndicator()
  if (store.autoScrollActive) {
    startAutoScroll()
  }
})
const handleUserScrollIntent = () => {
  if (store.autoScrollActive) {
    stopAutoScroll('已停止自动阅读')
  }
}
const handleChapterEndAutoAdvance = () => {
  const scrollElement = getScrollElement()
  const currentScrollTop = scrollElement.scrollTop
  const scrollingDown = currentScrollTop > lastScrollTop
  lastScrollTop = currentScrollTop
  if (
    store.autoScrollActive ||
    infiniteLoading.value ||
    noPoint.value ||
    isLoading.value ||
    autoReadJumping ||
    manualChapterAutoAdvancing ||
    !scrollingDown
  ) {
    return
  }
  const maxScrollTop = Math.max(
    0,
    scrollElement.scrollHeight - scrollElement.clientHeight,
  )
  if (maxScrollTop <= 0 || maxScrollTop - currentScrollTop > 1) {
    return
  }
  manualChapterAutoAdvancing = true
  if (!toNextChapterByAutoRead()) {
    manualChapterAutoAdvancing = false
  }
}
const getContent = (index: number, reloadChapter = true, chapterPos = 0) => {
  if (reloadChapter) {
    //展示进度条
    store.setShowContent(false)
    resetAutoReadIndicator()
    manualChapterAutoAdvancing = false
    //强制滚回顶层
    jump(top.value, { duration: 0 })
    //从目录，按钮切换章节时保存进度 预加载时不保存
    saveReadingBookProgressToBrowser(index, chapterPos)
    chapterData.value = []
  }
  const bookUrl = store.readingBook.bookUrl
  const { title, index: chapterIndex } = catalog.value[index]

  loadingWrapper(
    API.getBookContent(bookUrl, chapterIndex).then(
      res => {
        if (res.data.isSuccess) {
          const data = res.data.data
          const content = data.split(/\n+/)
          chapterData.value.push({ index, content, title })
          if (reloadChapter) toChapterPos(chapterPos)
        } else {
          ElMessage({ message: res.data.errorMsg, type: 'error' })
          const content = [res.data.errorMsg]
          chapterData.value.push({ index, content, title })
        }
        store.setContentLoading(true)
        noPoint.value = false
        store.setShowContent(true)
        manualChapterAutoAdvancing = false
        nextTick(syncLastScrollTop)
        if (!res.data.isSuccess) {
          throw res.data
        }
      },
      err => {
        const content = ['获取章节内容失败！']
        chapterData.value.push({ index, content, title })
        store.setShowContent(true)
        manualChapterAutoAdvancing = false
        nextTick(syncLastScrollTop)
        throw err
      },
    ),
  )
}

// 章节进度跳转和计算
const chapter = ref()
const chapterRef = ref()
const toChapterPos = (pos: number) => {
  nextTick(() => {
    if (chapterRef.value.length === 1)
      chapterRef.value[0].scrollToReadedLength(pos)
  })
}

// 60秒保存一次进度
const saveBookProgressThrottle = useThrottleFn(
  () => store.saveBookProgress(),
  60000,
)

const onReadedLengthChange = (index: number, pos: number) => {
  saveReadingBookProgressToBrowser(index, pos)
  saveBookProgressThrottle()
}

// 文档标题
watchEffect(() => {
  document.title = catalog.value[chapterIndex.value]?.title || document.title
})

// 阅读记录保存浏览器
const saveReadingBookProgressToBrowser = (index: number, pos: number) => {
  // 保存pinia
  chapterIndex.value = index
  chapterPos.value = pos
}

// 进度同步
// 返回导航变化 同步请求会在获取书架前完成

/**
 * VisibilityChange https://developer.mozilla.org/zh-CN/docs/Web/API/Document/visibilitychange_event
 * 监听关闭页面 切换tab 返回桌面 等操作
 * 注意不用监听点击链接导航变化 不对Safari<14.5兼容处理
 **/
const onVisibilityChange = () => {
  const _bookProgress = bookProgress.value
  if (document.visibilityState == 'hidden' && _bookProgress) {
    store.saveBookProgress()
  }
}
// 定时同步

// 章节切换
const toNextChapter = () => {
  store.setContentLoading(true)
  const index = chapterIndex.value + 1
  if (typeof catalog.value[index] !== 'undefined') {
    ElMessage({
      message: '下一章',
      type: 'info',
    })
    getContent(index)
    store.saveBookProgress()
  } else {
    ElMessage({
      message: '本章是最后一章',
      type: 'error',
    })
  }
}
const toPreChapter = () => {
  store.setContentLoading(true)
  const index = chapterIndex.value - 1
  if (typeof catalog.value[index] !== 'undefined') {
    ElMessage({
      message: '上一章',
      type: 'info',
    })
    getContent(index)
    store.saveBookProgress()
  } else {
    ElMessage({
      message: '本章是第一章',
      type: 'error',
    })
  }
}

let canJump = true
// 监听方向键
const handleKeyPress = (event: KeyboardEvent) => {
  if (!canJump) return
  if (
    store.autoScrollActive &&
    ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
  ) {
    handleUserScrollIntent()
  }
  const scrollElement = getScrollElement()
  switch (event.key) {
    case 'ArrowLeft':
      event.stopPropagation()
      event.preventDefault()
      toPreChapter()
      break
    case 'ArrowRight':
      event.stopPropagation()
      event.preventDefault()
      toNextChapter()
      break
    case 'ArrowUp':
      event.stopPropagation()
      event.preventDefault()
      if (scrollElement.scrollTop === 0) {
        ElMessage.warning('已到达页面顶部')
      } else {
        canJump = false
        jump(0 - scrollElement.clientHeight + 100, {
          duration: store.config.jumpDuration,
          callback: () => (canJump = true),
        })
      }
      break
    case 'ArrowDown':
      event.stopPropagation()
      event.preventDefault()
      if (scrollElement.clientHeight + scrollElement.scrollTop >= scrollElement.scrollHeight) {
        ElMessage.warning('已到达页面底部')
      } else {
        canJump = false
        jump(scrollElement.clientHeight - 100, {
          duration: store.config.jumpDuration,
          callback: () => (canJump = true),
        })
      }
      break
  }
}

// 阻止默认滚动事件
const ignoreKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault()
    event.stopPropagation()
  }
}

onMounted(async () => {
  await store.loadWebConfig()
  //获取书籍数据
  const bookUrl = sessionStorage.getItem('bookUrl')
  const name = sessionStorage.getItem('bookName')
  const author = sessionStorage.getItem('bookAuthor')
  const chapterIndex = Number(sessionStorage.getItem('chapterIndex') || 0)
  const chapterPos = Number(sessionStorage.getItem('chapterPos') || 0)
  const isSeachBook = sessionStorage.getItem('isSeachBook') === 'true'
  if (isNullOrBlank(bookUrl) || isNullOrBlank(name) || author === null) {
    ElMessage.warning('书籍信息为空，即将自动返回书架页面...')
    return setTimeout(toShelf, 500)
  }
  const book: typeof store.readingBook = {
    // @ts-expect-error: bookUrl name author is NON_Blank string here
    bookUrl,
    // @ts-expect-error: bookUrl name author is NON_Blank string here
    name,
    author,
    chapterIndex,
    chapterPos,
    isSeachBook,
  }
  onResize()
  syncLastScrollTop()
  window.addEventListener('resize', onResize)
  loadingWrapper(
    store.loadWebCatalog(book).then(chapters => {
      store.setReadingBook(book)
      getContent(chapterIndex, true, chapterPos)
      window.addEventListener('keyup', handleKeyPress)
      window.addEventListener('keydown', ignoreKeyPress)
      window.addEventListener('scroll', handleChapterEndAutoAdvance)
      window.addEventListener('wheel', handleUserScrollIntent)
      window.addEventListener('touchstart', handleUserScrollIntent)
      // 兼容Safari < 14
      document.addEventListener('visibilitychange', onVisibilityChange)
      //监听底部加载
      scrollObserver = new IntersectionObserver(onReachBottom, {
        rootMargin: '-100% 0% 20% 0%',
      })
      if (infiniteLoading.value === true) scrollObserver.observe(loading.value)
      //第二次点击同一本书 页面标题不会变化
      document.title = '...'
      document.title = (name as string) + ' | ' + chapters[chapterIndex].title
    }),
  )
})

onUnmounted(() => {
  stopAutoScroll(undefined)
  window.removeEventListener('keyup', handleKeyPress)
  window.removeEventListener('keydown', ignoreKeyPress)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('scroll', handleChapterEndAutoAdvance)
  window.removeEventListener('wheel', handleUserScrollIntent)
  window.removeEventListener('touchstart', handleUserScrollIntent)
  // 兼容Safari < 14
  document.removeEventListener('visibilitychange', onVisibilityChange)
  readSettingsVisible.value = false
  autoReadVisible.value = false
  popCataVisible.value = false
  scrollObserver?.disconnect()
  scrollObserver = null
})

const addToBookShelfConfirm = async () => {
  const book = store.readingBook
  // 阅读的是搜索的书籍 并未在书架
  if (book.isSeachBook === true) {
    await ElMessageBox.confirm(`是否将《${book.name}》放入书架？`, '放入书架', {
      confirmButtonText: '确认',
      cancelButtonText: '否',
      type: 'info',
      /*
        ElMessageBox.confirm默认在触发hashChange事件时自动关闭
        按下物理返回键时触发hashChange事件
        使用router.push("/")则不会触发hashChange事件
        */
      closeOnHashChange: false,
    })
      .then(() => {
        //选择是，无动作
        isSeachBook.value = false
      })
      .catch(async () => {
        //选择否，删除书籍
        await API.deleteBook(book)
      })
      .finally(() => sessionStorage.removeItem('isSeachBook'))
  }
}
onBeforeRouteLeave(async (to, from, next) => {
  console.log('onBeforeRouteLeave')
  // 弹窗时停止响应按键翻页
  stopAutoScroll(undefined)
  window.removeEventListener('keyup', handleKeyPress)
  window.removeEventListener('scroll', handleChapterEndAutoAdvance)
  autoReadVisible.value = false
  await addToBookShelfConfirm()
  next()
})
</script>

<style lang="scss" scoped>
:deep(.pop-setting-desktop) {
  margin-right: 12px;
  top: 0;
}

:deep(.pop-setting-mobile) {
  margin-left: 68px;
  top: 0;
}

:deep(.pop-autoread-desktop) {
  margin-right: 12px;
}

:deep(.pop-autoread-mobile) {
  margin-bottom: 12px;
}

:deep(.pop-cata-desktop) {
  margin-right: 12px;
}

:deep(.pop-cata-mobile) {
  margin-left: 10px;
}

.chapter-wrapper {
  padding: 0 4%;

  overflow-x: hidden;

  :deep(.no-point) {
    pointer-events: none;
  }

  .auto-read-indicator {
    position: fixed;
    z-index: 90;
    height: 2px;
    pointer-events: none;
    border-radius: 999px;
  }

  .tool-bar {
    position: fixed;
    top: 0;
    right: 50%;
    z-index: 100;

    .tools {
      display: flex;
      flex-direction: column;

      .tool-icon {
        font-size: 18px;
        width: 58px;
        height: 48px;
        text-align: center;
        padding-top: 12px;
        cursor: pointer;
        outline: none;

        .iconfont {
          font-family: iconfont;
          width: 16px;
          height: 16px;
          font-size: 16px;
          margin: 0 auto 6px;
        }

        .icon-text {
          font-size: 12px;
        }
      }
    }
  }

  .read-bar {
    position: fixed;
    bottom: 0;
    right: 50%;
    z-index: 100;

    .tools {
      display: flex;
      flex-direction: column;

      .tool-icon {
        font-size: 18px;
        width: 42px;
        height: 31px;
        padding-top: 12px;
        text-align: center;
        align-items: center;
        cursor: pointer;
        outline: none;
        margin-top: -1px;

        .iconfont {
          font-family: iconfont;
          width: 16px;
          height: 16px;
          font-size: 16px;
          margin: 0 auto 6px;
        }

        .icon-text {
          font-size: 12px;
        }
      }

      .auto-read-tool {
        width: 58px;
        height: 48px;
        padding-top: 8px;

        .auto-read-badge {
          margin: 0 auto 4px;
          font-size: 11px;
          line-height: 14px;
          letter-spacing: 0.12em;
          font-weight: 600;
        }
      }
    }
  }

  .chapter {
    font-family: 'Microsoft YaHei', PingFangSC-Regular, HelveticaNeue-Light,
      'Helvetica Neue Light', sans-serif;
    text-align: left;
    padding: 0 65px;
    min-height: 100vh;
    width: 670px;
    margin: 0 auto;

    .content {
      font-size: 18px;
      line-height: 1.8;
      font-family: 'Microsoft YaHei', PingFangSC-Regular, HelveticaNeue-Light,
        'Helvetica Neue Light', sans-serif;

      .bottom-bar,
      .top-bar {
        height: 64px;
      }
    }
  }
}

.day {
  :deep(.popup) {
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.12),
      0 0 6px rgba(0, 0, 0, 0.04);
  }

  :deep(.tool-icon) {
    border: 1px solid rgba(0, 0, 0, 0.1);
    margin-top: -1px;
    color: #000;

    .icon-text {
      color: rgba(0, 0, 0, 0.4);
    }
  }

  :deep(.chapter) {
    border: 1px solid #d8d8d8;
    color: #262626;
  }

  .auto-read-indicator {
    background: linear-gradient(
      90deg,
      rgba(184, 150, 108, 0),
      rgba(184, 150, 108, 0.55),
      rgba(184, 150, 108, 0)
    );
    box-shadow: 0 0 18px rgba(184, 150, 108, 0.28);
  }
}

.night {
  :deep(.popup) {
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.48),
      0 0 6px rgba(0, 0, 0, 0.16);
  }

  :deep(.tool-icon) {
    border: 1px solid #444;
    margin-top: -1px;
    color: #666;

    .icon-text {
      color: #666;
    }
  }

  :deep(.chapter) {
    border: 1px solid #444;
    color: #666;
  }

  :deep(.popper__arrow) {
    background: #666;
  }

  .auto-read-indicator {
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0),
      rgba(255, 255, 255, 0.32),
      rgba(255, 255, 255, 0)
    );
    box-shadow: 0 0 18px rgba(255, 255, 255, 0.12);
  }
}

@media screen and (max-width: 776px) {
  .chapter-wrapper {
    padding: 0;

    .tool-bar {
      left: 0;
      right: auto;
      width: 100vw;
      margin-right: 0 !important;

      .tools {
        flex-direction: row;
        justify-content: space-between;

        .tool-icon {
          border: none;
        }
      }
    }

    .read-bar {
      right: 0;
      width: 100vw;
      margin-right: 0 !important;

      .tools {
        flex-direction: row;
        justify-content: space-between;
        padding: 0 15px;

        .tool-icon {
          border: none;
          width: auto;

          .iconfont {
            display: inline-block;
          }
        }

        .auto-read-tool {
          padding-top: 10px;
        }
      }
    }

    .chapter {
      width: 100vw !important;
      padding: 0 20px;
      box-sizing: border-box;
    }
  }
}
</style>
