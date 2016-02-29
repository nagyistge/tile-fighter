/// <reference path="./references.d.ts" />

import * as PIXI from 'pixi.js'
import * as _ from 'lodash'
import Menubar from './menubar'
import Character from './character'
import {keyboard} from './keyboard'
import Graph from './logic/graph'
import GridNode from './logic/gridnode'
import PathFinder from './logic/path-finder'
import {Config} from './config'
import {LCG, cartesianToIsometric} from './util'

let renderer: PIXI.WebGLRenderer|PIXI.CanvasRenderer
let container: PIXI.Container
let menu: Menubar
let character: Character
let tilemap: Tilemap

const LCGRandom = new LCG(1)

export class Tilemap extends PIXI.Container {
  tilesAmountX: number
  tilesAmountY: number
  startLocation: PIXI.Point
  zoom: number
  scale: PIXI.Point
  graph: Graph
  keyW: any
  keyA: any
  keyS: any
  keyD: any
  keyC: any
  interactive: boolean
  character: Character
  position: PIXI.Point
  vx: number
  vy: number
  tileSize: number
  tileWidthHalf: number
  tileHeightHalf: number
  selectedGraphics: PIXI.Graphics
  mouseoverGraphics: PIXI.Graphics
  mousedown: any
  touchstart: any
  touchmove: any
  mousemove: any
  selectedTileCoords: number[]
  mousePressPoint: number[]

  constructor(width: number, height: number) {
    super()
    this.interactive = true

    this.tilesAmountX = width
    this.tilesAmountY = height

    this.tileSize = Config.tileSize
    this.tileWidthHalf = this.tileSize / 2
    this.tileHeightHalf = this.tileSize / 4

    this.zoom = 1
    this.scale.x = this.scale.y = this.zoom

    this.startLocation = this.position = new PIXI.Point(0, 0)

    this.generateMap()

    this.graph = new Graph(this.children)

    this.keyW = keyboard(87)
    this.keyA = keyboard(65)
    this.keyS = keyboard(83)
    this.keyD = keyboard(68)
    this.keyC = keyboard(67)

    this.character = new Character(0, 0)
    this.vx = 0
    this.vy = 0

    this.selectedTileCoords = [0, 0]
    this.mousePressPoint = [0, 0]
    this.selectedGraphics = new PIXI.Graphics()
    this.mouseoverGraphics = new PIXI.Graphics()

    this.addChild(this.selectedGraphics)
    this.addChild(this.mouseoverGraphics)

    this.mousedown = this.touchstart = function (event: any) {
      if (event.data.global.x > Config.menuBarWidth) {
        this.mousePressPoint[0] = event.data.global.x - this.position.x - this.tileSize
        this.mousePressPoint[1] = event.data.global.y - this.position.y

        this.selectTile(Math.floor(
            (this.mousePressPoint[0] / (this.tileWidthHalf * this.zoom / 2) + this.mousePressPoint[1] / (this.tileHeightHalf * this.zoom / 2)) / 8),
          Math.floor((this.mousePressPoint[1] / (this.tileHeightHalf * this.zoom / 2) - (this.mousePressPoint[0] / (this.tileWidthHalf * this.zoom / 2))) / 8))
      }
    }

    this.mousemove = this.touchmove = function (event: any) {
      const mouseOverPoint = [event.data.global.x - this.position.x, event.data.global.y - this.position.y]
      const mouseoverTileCoords = [Math.floor(
        (mouseOverPoint[0] / (this.tileWidthHalf * this.zoom / 2) + mouseOverPoint[1] / (this.tileHeightHalf * this.zoom / 2)) / 8),
        Math.floor((mouseOverPoint[1] / (this.tileHeightHalf * this.zoom / 2) - (mouseOverPoint[0] / (this.tileWidthHalf * this.zoom / 2))) / 8)]

      const xValue = (mouseoverTileCoords[0] - mouseoverTileCoords[1]) * this.tileSize
      const yValue = ((mouseoverTileCoords[0] >= mouseoverTileCoords[1] ?
          mouseoverTileCoords[0] : mouseoverTileCoords[1]) - Math.abs(mouseoverTileCoords[0] - mouseoverTileCoords[1]) / 2) * this.tileSize

      this.drawRectangle(this.mouseoverGraphics, xValue, yValue, 0xFFFFFF)
    }

    this.keyW.press = () => this.vy = Config.mapScrollSpeed
    this.keyD.press = () => this.vx = -Config.mapScrollSpeed
    this.keyA.press = () => this.vx = Config.mapScrollSpeed
    this.keyS.press = () => this.vy = -Config.mapScrollSpeed

    this.keyD.release = this.keyA.release = () => this.vx = 0
    this.keyW.release = this.keyS.release = () => this.vy = 0
    this.keyC.press = () => this.character.isCrouched = !this.character.isCrouched
  }

  drawRectangle(graphics: PIXI.Graphics, xValue: number, yValue: number, color: number) {
    const up = [xValue - this.tileWidthHalf, yValue + this.tileWidthHalf]
    const left = [xValue + this.tileWidthHalf, yValue]
    const right = [xValue + this.tileSize + this.tileWidthHalf, yValue + this.tileWidthHalf]
    const down = [xValue + this.tileWidthHalf, yValue + this.tileSize]

    graphics.clear()
    graphics.lineStyle(1, color, 0.8)
    graphics.moveTo(up[0], up[1])
    graphics.lineTo(left[0], left[1])
    graphics.moveTo(up[0], up[1])
    graphics.lineTo(down[0], down[1])
    graphics.moveTo(down[0], down[1])
    graphics.lineTo(right[0], right[1])
    graphics.moveTo(right[0], right[1])
    graphics.lineTo(left[0], left[1])
    graphics.endFill()
  }

  addTile(x: number, y: number, terrain: any) {
    const tile = PIXI.Sprite.fromFrame(terrain.name) as any
    tile.position = cartesianToIsometric(x * this.tileSize, y * this.tileSize)
    tile.position.x -= this.tileSize / 2
    tile.terrain = terrain.name
    tile.weight = terrain.weight
    this.addChildAt(tile, x * this.tilesAmountY + y)
  }

  changeTile(x: number, y: number, tile: any) {
    this.removeChild(this.getTile(x, y) as any)
    this.addTile(x, y, tile)
  }

  getTile(x: number, y: number) {
    return this.getChildAt(x * this.tilesAmountY + y) as any
  }

  generateMap() {
    for (let x = 0; x < this.tilesAmountX; x++) {
      for (let y = 0; y < this.tilesAmountY; y++) {
        this.addTile(x, y, Config.GRASS)
      }
    }

    this.spawnXLine(new PIXI.Point(0, 38), true, Config.ROAD)
    this.spawnYLine(new PIXI.Point(0, 10), true, Config.ROAD)

    this.spawnChunks(6,
      Math.floor(0.3 * this.tilesAmountX),
      Math.floor(0.44 * this.tilesAmountY),
      Config.WATER)

    this.spawnChunks(6,
      Math.floor(0.8 * this.tilesAmountX),
      Math.floor(0.44 * this.tilesAmountY),
      Config.WATER)

    for (let i = 0; i < 28; i++) {
      this.spawnChunks(4, Math.floor(LCGRandom.randomFloat() * Config.tilesX - 1),
        Math.floor(LCGRandom.randomFloat() * Config.tilesY - 1), Config.WOOD)
    }
  }

  spawnXLine(position: PIXI.Point, directionX: boolean, element: any) {
    this.changeTile(position.x, position.y, element)
    const x: number = directionX ? position.x + 1 : position.x - 1
    const y: number = directionX ? position.y : position.y + 1
    if (x < this.tilesAmountX && y < this.tilesAmountY - 1 && x >= 0 && y >= 0) {
      this.spawnYLine(new PIXI.Point(x, y), LCGRandom.randomFloat() < 0.9, element)
    }
  }

  spawnYLine(position: PIXI.Point, directionX: boolean, element: any) {
    this.changeTile(position.x, position.y, element)
    const x = directionX ? position.x + 1 : position.x - 1
    const y = directionX ? position.y : position.y + 1
    if (x < this.tilesAmountX && y < this.tilesAmountY - 1 && x >= 0 && y >= 0) {
      this.spawnXLine(new PIXI.Point(x, y), LCGRandom.randomFloat() < 0.8, element)
    }
  }

  spawnChunks(size: number, x: number, y: number, element: any) {
    x = Math.max(x, 0)
    x = Math.min(x, this.tilesAmountX - 1)
    y = Math.max(y, 0)
    y = Math.min(y, this.tilesAmountY - 1)

    this.changeTile(x, y, element)

    for (let i = 0; i < size; i++) {
      const horizontal = Math.floor(LCGRandom.randomFloat() * 2) - 1
      const vertical = Math.floor(LCGRandom.randomFloat() * 2) - 1
      this.spawnChunks(size - 1, x + horizontal, y + vertical, element)
    }
  }

  selectTile(x: number, y: number) {
    this.selectedTileCoords = [x, y]
    menu.selectedTileCoordText.text = 'Tile: ' + this.selectedTileCoords[0] + ',' + this.selectedTileCoords[1]
    menu.selectedTileTypeText.text = 'Terrain: ' + this.getTile(x, y).terrain

    const xValue = (this.selectedTileCoords[0] - this.selectedTileCoords[1]) * this.tileSize
    const yValue = ((this.selectedTileCoords[0] >= this.selectedTileCoords[1] ?
        this.selectedTileCoords[0] :
        this.selectedTileCoords[1]) - Math.abs(this.selectedTileCoords[0] - this.selectedTileCoords[1]) / 2) * this.tileSize

    console.log('character', this.character)
    if (this.getTile(x, y).terrain === Config.WOOD.name || this.getTile(x, y).terrain === Config.WATER.name) {
      console.log('1')
      menu.movementWarning.text = 'Can\'t move to ' + this.getTile(x, y).terrain
    } else if (_.isEqual(this.character.tile, this.selectedTileCoords)) {
      console.log('2')
      this.character.selected = !this.character.selected
      character.drawCharter(this)
    } else if (this.character.selected) {
      console.log('3')
      menu.movementWarning.text = ''
      const path = PathFinder.search(this.graph, this.graph.grid[this.character.tile[0]][this.character.tile[1]], this.graph.grid[x][y])
      console.log('path',path)
      const directions = character.getDirection(path, this.character.tile)
      //console.log('dir', directions, this.graph.grid[this.character.tile[0]][this.character.tile[1]], this.graph.grid[x][y])
      character.moveCharacter(this, directions, this.character, _.partial(character.drawCharter, this))
      this.character.tile = [x, y]
    } else {
      console.log('4')
      character.drawCharter(this)
    }
    this.drawRectangle(this.selectedGraphics, xValue, yValue, this.character.selected ? 0xFF0000 : 0xFFFFFF)
  }

  zoomIn() {
    this.zoom = Math.min(this.zoom * 2, 8)
    this.scale.x = this.scale.y = this.zoom
    this.centerOnSelectedTile()
    this.constrainTilemap()
  }

  zoomOut() {
    this.mouseoverGraphics.clear()
    this.zoom = Math.max(this.zoom / 2, 0.5)
    this.scale.x = this.scale.y = this.zoom
    this.centerOnSelectedTile()
    this.constrainTilemap()
  }

  centerOnSelectedTile() {
    this.position.x = (Config.screenX - Config.menuBarWidth) / 2 -
      this.selectedTileCoords[0] * this.zoom * this.tileSize -
      this.tileSize * this.zoom / 2 + Config.menuBarWidth
    this.position.y = Config.screenY / 2 -
      this.selectedTileCoords[1] * this.zoom * this.tileSize -
      this.tileSize * this.zoom / 2
  }

  constrainTilemap() {
    this.position.x = Math.max(this.position.x, -2 * this.tileSize * this.tilesAmountX * this.zoom + Config.screenX)
    this.position.x = Math.min(this.position.x, this.tileSize * this.tilesAmountX * this.zoom + Config.screenX)
    this.position.y = Math.max(this.position.y, -2 * this.tileSize * this.tilesAmountY * this.zoom + Config.screenY)
    this.position.y = Math.min(this.position.y, +Config.menuBarWidth)
  }

  inputHandler() {
    this.position.x += this.vx
    this.position.y += this.vy
    this.constrainTilemap()
  }
}

const animate = () => {
  renderer.render(container)
  tilemap.inputHandler()
  requestAnimationFrame(animate)
}

export default {
  initRenderer: () => {
    renderer = PIXI.autoDetectRenderer(Config.screenX, Config.screenY)
    renderer.view.style.border = '2px solid #000'
    renderer.backgroundColor = 0xEEEEEE
    document.body.appendChild(renderer.view)
    container = new PIXI.Container()
  },

  loadTexture: (mapFilePath: string, characterFilePath: string) => {
    const loader = new PIXI.loaders.Loader()
    loader.add([mapFilePath, characterFilePath])
    loader.once('complete', () => {
      tilemap = new Tilemap(Config.tilesX, Config.tilesY)
      container.addChild(tilemap)

      character = new Character(0, 0)
      container.addChild(character)

      menu = new Menubar(tilemap)
      container.addChild(menu)

      tilemap.selectTile(tilemap.startLocation.x, tilemap.startLocation.y)
      tilemap.zoomIn()

      requestAnimationFrame(animate)
    })
    loader.load()
  }
}
