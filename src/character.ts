/// <reference path='./references.d.ts' />

import * as PIXI from 'pixi.js'
import {mapObject} from './util'
import {assign} from 'lodash'
import {config} from './config'

class Character extends PIXI.Container {
  tile: {x: number, y: number}
  direction: number
  isCrouched: boolean
  isMoving: boolean
  isSelected: boolean
  characterSprite: any

  constructor(x: number, y: number) {
    super()
    this.isCrouched = false
    this.isMoving = false
    this.isSelected = false
    this.tile = {x: 0, y: 0}
    this.direction = 135
    this.characterSprite = PIXI.Sprite.fromFrame('Jog_' + this.direction + '_01')
    this.characterSprite.position = {x: 0, y: -20}
  }

  getDirection(route: {x: number, y: number}[], currentPos: {x: number, y: number}) {
    const directions: number[] = []
    let pos = {x: currentPos.x, y: currentPos.y}
    route.forEach((dir) => {
      const nextPos = {x: dir.x, y: dir.y}
      if (nextPos.x > pos.x) {
        directions.push(135)
      } else if (nextPos.x < pos.x) {
        directions.push(315)
      } else if (nextPos.y > pos.y) {
        directions.push(225)
      } else if (nextPos.y < pos.y) {
        directions.push(45)
      }
      pos = nextPos
    })
    return directions
  }

  drawCharter(that: any) {
    const tempPos = that.character.characterSprite.position
    that.character.characterSprite = PIXI.Sprite.fromFrame('Jog_' + that.character.direction + '_01')
    that.character.characterSprite.position = tempPos
    that.character.characterSprite.depth = 1

    if (!that.character.characterSprite) {
      that.addChild(that.character.characterSprite)
    }
    that.addChild(that.character.characterSprite)
  }

  loadFrames(direction: number, isCrouched: boolean) {
    const frames: PIXI.Texture[] = []
    const fileNamePrefix = isCrouched ? 'Crouch' : 'Jog'
    for (var i = 1; i < 14; i++) {
      const val = i < 10 ? '0' + i : i
      frames.push(PIXI.Texture.fromFrame(fileNamePrefix + '_' + direction + '_' + val))
    }
    return frames
  }

  checkNearByTiles(that: any, character: any) {
    console.log('checkNearByTiles', that.character, character)

    const x = character.tile.x - 1 > 0 ? character.tile.x - 1 : 0
    const y = character.tile.y - 1 > 0 ? character.tile.y - 1 : 0
    console.log('checkNearByTiles', {x, y: character.tile.y}, {x: character.tile.x, y})

    const tileUpperLeft: any = assign(that.getTile({x, y: character.tile.y}), {depth: -1})
    const tileUpperRight: any = assign(that.getTile({x: character.tile.x, y}), {depth: -1})

    console.log('tileUpperLeft', tileUpperLeft, {x, y: character.tile.y})
    console.log('tileUpperRight', tileUpperRight, {x: character.tile.x, y})

    if (/^House_corne/.test(tileUpperLeft.terrain)) {
      that.changeTile({x, y: character.tile.y}, tileUpperLeft)
    }
    if (/^House_corne/.test(tileUpperRight.terrain)) {
      that.changeTile({x: character.tile.x, y}, tileUpperRight)
    }

  }

  moveCharacter(that: any, directions: number[], character: any, callback: any) {
    const pos = character.characterSprite.position
    const isCrouched = character.isCrouched
    character.isMoving = true
    const doAnimation = () => {
      if (directions.length === 0) {
        return callback(that)
      }

      that.removeChild(that.character.characterSprite)
      let click = 0
      const movementTime = 10
      that.movie = new PIXI.extras.MovieClip(this.loadFrames(directions[0], isCrouched))
      that.movie.position.set(pos.x, pos.y)
      that.movie.anchor.set(0, 0)
      that.movie.pivot.set(1, 1)
      that.movie.animationSpeed = 0.7
      that.movie.depth = 1
      that.movie.play()
      that.addChild(that.movie)

      while (click < config.tileSize) {
        window.setTimeout(() => {
          if (directions[0] === 45) {
            character.tile.y -= 0.02
            that.movie.position.set(pos.x++, pos.y -= 0.5)
          } else if (directions[0] === 135) {
            character.tile.x += 0.02
            that.movie.position.set(pos.x++, pos.y += 0.5)
          } else if (directions[0] === 225) {
            character.tile.y += 0.02
            that.movie.position.set(pos.x--, pos.y += 0.5)
          } else if (directions[0] === 315) {
            character.tile.x -= 0.02
            that.movie.position.set(pos.x--, pos.y -= 0.5)
          }
        }, click * movementTime)
        click++
      }
      window.setTimeout(() => {
        character.tile = mapObject(character.tile, (x: number) => Math.round(x))
        that.removeChild(that.movie)

        character.direction = directions[0]
        if (directions.length > 1) {
          directions.shift()
          doAnimation()
        } else {
          character.isMoving = false
          callback(that)
        }
      }, config.tileSize * movementTime)
    }

    doAnimation()
  }
}

export default Character
