export type webReadConfig = {
  theme: number
  font: number
  fontSize: number
  readWidth: number
  infiniteLoading: boolean
  customFontName: string
  jumpDuration: number
  autoReadMode: 'page' | 'scroll'
  autoScrollSpeed: number
  autoScrollDirection: 'down' | 'up'
  spacing: {
    paragraph: number
    line: number
    letter: number
  }
}
