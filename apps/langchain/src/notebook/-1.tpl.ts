import { cell } from '../utils'

/**
 * notebook cell模板
 */
export default class Tpl {
  static cells: string[] = []

  @cell
  async hello() {
    console.log('hello world')
  }
}
