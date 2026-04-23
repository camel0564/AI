import { cell } from '../utils'

/**
 * cell模板
 */
export default class Tpl {
  static cells: string[] = []

  @cell
  async hello() {
    console.log('hello world')
  }
}
