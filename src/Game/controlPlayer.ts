import Game from ".";
import { GAME_STATUS, Obstacal, playerStatus } from "./const";
import Environment, { roadLength, roadWidth } from "./environment";
import * as THREE from "three";
import { EventEmitter } from "events";
import Player from "./player";
import { eyeTrackingController } from "../eyeControl";
import { spatialAudioController } from "../spatialAudio";
// @ts-ignore
import showToast from "../components/Toast/index.js";

enum Side {
  FRONT = 0,
  BACK = 1,
  LEFT = 2,
  RIGHT = 3,
  DOWN = 4,
  FRONTDOWN = 5,
  UP = 6,
}

export class ControlPlayer extends EventEmitter {
  model: THREE.Group;
  mixer: THREE.AnimationMixer;
  status!: string;
  renderer!: THREE.WebGLRenderer;
  score = 0;
  coin = 0;

  allAnimate: Record<string, THREE.AnimationAction>;
  runVelocity: number;
  jumpHight: number;
  targetPosition!: number;
  way!: number;
  lastPosition!: number;
  isJumping = false;
  capsule!: THREE.Mesh<THREE.CapsuleGeometry, THREE.MeshNormalMaterial>;
  game: Game;
  player: Player;
  scene: THREE.Scene = new THREE.Scene();
  smallMistake!: number;
  far: number;
  key!: string;
  originLocation!: THREE.Vector3;
  removeHandle = true;
  lastAnimation!: string;
  roll!: boolean;
  runlookback!: boolean;
  playerRunDistance!: number;
  environement: Environment = new Environment();
  currentPlane = -1;
  isAddPlane = false;
  fallingSpeed = 0;
  downCollide = false;

  private lastCollisionTime = 0;
  private lastSideCollisionTime = 0;

  gameStatus: GAME_STATUS = GAME_STATUS.READY;
  gameStart = false;
  raycasterDown: THREE.Raycaster;
  raycasterFrontDown: THREE.Raycaster;
  raycasterFront: THREE.Raycaster;
  raycasterRight: THREE.Raycaster;
  raycasterLeft: THREE.Raycaster;
  frontCollide: boolean;
  firstFrontCollide: Record<string, any> = {
    isCollide: true,
    collideInfo: null,
  };
  frontCollideInfo: any;
  leftCollide: boolean;
  rightCollide: boolean;
  upCollide: boolean;

  // Distance thresholds (keep for backward compatibility)
  private readonly TRAIN_WARNING_DISTANCE = 80;
  private readonly CRITICAL_WARNING_DISTANCE = 40;
  private readonly ANNOUNCEMENT_COOLDOWN = 1000;
  private readonly COLLISION_COOLDOWN = 1500;

  constructor(
    model: THREE.Group,
    mixer: THREE.AnimationMixer,
    currentAction = "run",
    allAnimate: Record<string, THREE.AnimationAction>
  ) {
    super();
    this.model = model;
    this.mixer = mixer;
    this.game = new Game();
    this.player = new Player();
    this.scene = this.game.scene;
    this.allAnimate = allAnimate;
    this.runVelocity = 20;
    this.jumpHight = 3.3;
    this.gameStart = false;
    this.far = 2.5;
    this.raycasterDown = new THREE.Raycaster();
    this.raycasterFrontDown = new THREE.Raycaster();
    this.raycasterFront = new THREE.Raycaster();
    this.raycasterRight = new THREE.Raycaster();
    this.raycasterLeft = new THREE.Raycaster();
    this.frontCollide = false;
    this.leftCollide = false;
    this.rightCollide = false;
    this.downCollide = true;
    this.upCollide = false;
    this.isJumping = false;
    this.startGame(currentAction, model);
    this.addAnimationListener();
    this.initRaycaster();
  }

  // Use spatial audio controller for obstacle warnings
  speakObstacleWarning = (
    message: string,
    obstacleType?: string,
    direction?: string,
    isUrgent = false
  ) => {
    spatialAudioController.speakObstacleWarning(message, obstacleType, direction, isUrgent);
  };

  private getCurrentLaneName(): string {
    switch (this.way) {
      case 1:
        return "left";
      case 2:
        return "center";
      case 3:
        return "right";
      default:
        return "center";
    }
  }

  private getTrainLane(trainX: number): string {
    const roadWidth = 15;
    const threeRoad = [-roadWidth / 3, 0, roadWidth / 3];

    let closestLane = 0;
    let minDistance = Math.abs(trainX - threeRoad[0]);

    for (let i = 1; i < threeRoad.length; i++) {
      const distance = Math.abs(trainX - threeRoad[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closestLane = i;
      }
    }

    switch (closestLane) {
      case 0:
        return "left";
      case 1:
        return "center";
      case 2:
        return "right";
      default:
        return "center";
    }
  }

  speakGameOver = () => {
    spatialAudioController.speakGameOver();
  };
  private setupEyeTrackingIntegration() {
    // Emit game state events for eye tracking
    this.on("gamestart", () => {
      window.dispatchEvent(new CustomEvent("gamestart"));
      eyeTrackingController.setGameActive(true);
    });

    this.on("gameend", () => {
      window.dispatchEvent(new CustomEvent("gameend"));
      eyeTrackingController.setGameActive(false);
    });

    this.on("gamepause", () => {
      eyeTrackingController.setGameActive(false);
    });

    this.on("gameresume", () => {
      eyeTrackingController.setGameActive(true);
    });
  }
  startGame(currentAction: string, model: THREE.Group) {
    this.status = currentAction;
    this.allAnimate[currentAction].play();
    this.lastAnimation = currentAction;
    this.way = 2;
    this.roll = false;
    this.runlookback = false;
    this.playerRunDistance = model.position.z;
    this.smallMistake = 0;
    this.key = "";
    this.originLocation = model.position;
    this.lastPosition = model.position.x;
    this.targetPosition = 0;

    // Reset spatial audio system
    spatialAudioController.reset();
    
    this.lastCollisionTime = 0;
    this.lastSideCollisionTime = 0;
    this.setupEyeTrackingIntegration();
    this.emit("gamestart");
  }

  initRaycaster() {
    const initialDirection = new THREE.Vector3(0, -1, 0);
    const rotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      Math.PI / 6
    );
    const direction = initialDirection
      .clone()
      .applyQuaternion(rotation)
      .normalize();
    this.raycasterFrontDown.ray.direction = new THREE.Vector3(0, 1, 0);
    this.raycasterDown.ray.direction = new THREE.Vector3(0, -1, 0);
    this.raycasterFrontDown.ray.direction = direction;
    this.raycasterLeft.ray.direction = new THREE.Vector3(-1, 0, 0);
    this.raycasterRight.ray.direction = new THREE.Vector3(1, 0, 0);

    this.raycasterDown.far = 5.8;
    this.raycasterFrontDown.far = 3;
  }

  addAnimationListener() {
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      const key = e.code;

      if (key === "Enter") {
        if (!this.gameStart && this.gameStatus === GAME_STATUS.READY) {
          this.gameStart = true;
          this.gameStatus = GAME_STATUS.START;
          this.key = "Enter";
          this.game.emit("gameStatus", this.gameStatus);
          setTimeout(() => {
            eyeTrackingController.setGameActive(true);
            console.log("Eye tracking activated for gameplay");
          }, 1000);
        }
        return;
      }

      if (key === "Space") {
        if (
          this.status === playerStatus.DIE ||
          this.gameStatus === GAME_STATUS.END
        ) {
          eyeTrackingController.setGameActive(false);
          this.gameStart = false;
          this.gameStatus = GAME_STATUS.READY;
          this.game.emit("gameStatus", this.gameStatus);
          this.smallMistake = 0;

          while (this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
          }

          this.environement.startGame();
          this.player.createPlayer(false);
        }
        return;
      }

      if (
        key === "ArrowUp" &&
        this.status !== playerStatus.JUMP &&
        this.status !== playerStatus.FALL &&
        this.downCollide
      ) {
        if (!this.gameStart || this.status === playerStatus.DIE) return;

        this.key = "ArrowUp";
        this.downCollide = false;
        this.isJumping = true;
        setTimeout(() => {
          this.isJumping = false;
        }, 50);
        this.fallingSpeed += this.jumpHight * 0.1;
      } else if (
        key === "ArrowDown" &&
        !this.roll &&
        this.status !== playerStatus.ROLL
      ) {
        if (!this.gameStart || this.status === playerStatus.DIE) return;

        this.roll = true;
        setTimeout(() => {
          this.roll = false;
        }, 620);
        this.key = "ArrowDown";
        this.fallingSpeed = -5 * 0.1;
      } else if (key === "ArrowLeft") {
        if (!this.gameStart || this.status === playerStatus.DIE) return;

        if (this.way === 1) {
          const currentTime = Date.now();
          if (
            currentTime - this.lastSideCollisionTime >=
            this.COLLISION_COOLDOWN
          ) {
            this.runlookback = true;
            this.emit("collision");
            showToast("Hit wall on left!");
            this.speakObstacleWarning("Hit wall on left!", "wall", "left side");
            this.lastSideCollisionTime = currentTime;
            this.smallMistake += 1;

            setTimeout(() => {
              this.runlookback = false;
            }, 1040);
          }
          return;
        }
        this.way -= 1;
        this.originLocation = this.model.position.clone();
        this.lastPosition = this.model.position.clone().x;
        this.targetPosition -= roadWidth / 3;
      } else if (key === "ArrowRight") {
        if (!this.gameStart || this.status === playerStatus.DIE) return;

        if (this.way === 3) {
          const currentTime = Date.now();
          if (
            currentTime - this.lastSideCollisionTime >=
            this.COLLISION_COOLDOWN
          ) {
            this.runlookback = true;
            this.emit("collision");
            showToast("Hit wall on right!");
            this.speakObstacleWarning(
              "Hit wall on right!",
              "wall",
              "right side"
            );
            this.lastSideCollisionTime = currentTime;
            this.smallMistake += 1;

            setTimeout(() => {
              this.runlookback = false;
            }, 1040);
          }
          return;
        }
        this.originLocation = this.model.position.clone();
        this.lastPosition = this.model.position.clone().x;
        this.targetPosition += roadWidth / 3;
        this.way += 1;
      }
    });
  }

  handleLeftRightMove() {
    const targetPosition = this.targetPosition;
    const lastPosition = this.lastPosition;
    if (Math.abs(targetPosition - lastPosition) < 1) {
      this.removeHandle = true;
    }
    if (targetPosition !== lastPosition) {
      if ((this.leftCollide || this.rightCollide) && this.removeHandle) {
        const currentTime = Date.now();
        if (
          currentTime - this.lastSideCollisionTime >=
          this.COLLISION_COOLDOWN
        ) {
          this.smallMistake += 1;
          this.emit("collision");
          showToast("Hit obstacle!");
          const direction =
            targetPosition > lastPosition ? "right side" : "left side";
          this.speakObstacleWarning("Hit obstacle!", "obstacle", direction);
          this.lastSideCollisionTime = currentTime;
        }

        this.targetPosition = this.originLocation.x;
        this.removeHandle = false;
        if (targetPosition > lastPosition) {
          this.way -= 1;
        } else {
          this.way += 1;
        }
      }
      const moveSpeed = 0.15;
      const diff = targetPosition - lastPosition;
      if (Math.abs(diff) > 0.0001) {
        this.model.position.x += diff * moveSpeed;
        this.lastPosition += diff * moveSpeed;
      }
    }
  }

  handleUpdownMove() {}

  collideCheckAll() {
    const position = this.model.position.clone();
    try {
      this.collideCheck(Side.DOWN, position, 5);
      this.collideCheck(Side.FRONTDOWN, position, 3);
      this.collideCheck(Side.FRONT, position, 2);
      this.collideCheck(Side.LEFT, position, 1);
      this.collideCheck(Side.RIGHT, position, 1);
    } catch (error) {
      console.log(error);
    }
  }

  collideCheck(side: Side, position: THREE.Vector3, far = 2.5) {
    const { x, y, z } = position;
    switch (side) {
      case Side.DOWN:
        this.raycasterDown.ray.origin = new THREE.Vector3(x, y + 4, z + 0.5);
        this.raycasterDown.far = far;
        break;
      case Side.FRONTDOWN:
        this.raycasterFrontDown.ray.origin = new THREE.Vector3(x, y + 2, z);
        this.raycasterFrontDown.far = far;
        break;
      case Side.FRONT:
        this.raycasterFront.ray.origin = new THREE.Vector3(x, y + 2, z - 1);
        this.raycasterFront.far = far;
        break;
      case Side.LEFT:
        this.raycasterLeft.ray.origin = new THREE.Vector3(x + 0.5, y + 2, z);
        this.raycasterLeft.far = far;
        break;
      case Side.RIGHT:
        this.raycasterRight.ray.origin = new THREE.Vector3(x - 0.5, y + 2, z);
        this.raycasterRight.far = far;
        break;
    }

    const ds = this.playerRunDistance;
    const nowPlane = Math.floor(ds / roadLength);
    const intersectPlane = this.environement.plane?.[nowPlane];
    const intersectObstacal = this.environement.obstacal?.[nowPlane];
    const intersectCoin = this.environement.coin?.[nowPlane];
    if (!intersectObstacal && !intersectPlane) {
      return;
    }

    const origin = new THREE.Vector3(x, position.y + 3, z);
    const originDown = new THREE.Vector3(x, position.y + 4.6, z - 0.5);
    switch (side) {
      case Side.DOWN: {
        if (!intersectPlane) {
          return;
        }
        const c1 = this.raycasterDown.intersectObjects([
          intersectPlane,
          intersectObstacal,
        ])[0]?.object.name;
        this.raycasterDown.ray.origin = originDown;
        const c2 = this.raycasterDown.intersectObjects([
          intersectPlane,
          intersectObstacal,
        ])[0]?.object.name;
        c1 || c2 ? (this.downCollide = true) : (this.downCollide = false);
        break;
      }
      case Side.FRONT: {
        const r1 = this.raycasterFront.intersectObjects([
          intersectObstacal,
          intersectCoin,
        ])[0];
        const r1Name = r1?.object.name;
        if (r1Name === "coin") {
          r1.object.visible = false;
          this.coin += 1;
        }
        const c1 = r1Name && r1Name !== "coin";
        this.raycasterFront.far = 1.5;
        const r2 = this.raycasterFront.intersectObjects([
          intersectObstacal,
          intersectCoin,
        ])[0];
        const r2Name = r2?.object.name;
        if (r2Name === "coin") {
          r2.object.visible = false;
          this.coin += 1;
        }
        const c2 = r2Name && r2Name !== "coin";
        this.frontCollideInfo = r1 || r2;
        c1 || c2 ? (this.frontCollide = true) : (this.frontCollide = false);
        break;
      }
      case Side.FRONTDOWN: {
        const r1 = this.raycasterFrontDown.intersectObjects([
          intersectObstacal,
          intersectCoin,
        ])[0];
        const r1Name = r1?.object.name;
        if (r1Name === "coin") {
          r1.object.visible = false;
          this.coin += 1;
        }
        const c1 = r1Name && r1Name !== "coin";
        c1 ? (this.frontCollide = true) : (this.frontCollide = false);
        break;
      }
      case Side.LEFT: {
        const r1 = this.raycasterLeft.intersectObjects([
          intersectObstacal,
          intersectCoin,
        ])[0];
        const r1Name = r1?.object.name;
        if (r1Name === "coin") {
          r1.object.visible = false;
          this.coin += 1;
        }
        const c1 = r1Name && r1Name !== "coin";
        this.raycasterLeft.ray.origin = origin;
        const r2 = this.raycasterLeft.intersectObjects([
          intersectObstacal,
          intersectCoin,
        ])[0];
        const r2Name = r2?.object.name;
        if (r2Name === "coin") {
          r2.object.visible = false;
          this.coin += 1;
        }
        const c2 = r2Name && r2Name !== "coin";
        c1 || c2 ? (this.leftCollide = true) : (this.leftCollide = false);
        break;
      }
      case Side.RIGHT: {
        const r1 = this.raycasterRight.intersectObjects([
          intersectObstacal,
          intersectCoin,
        ])[0];
        const r1Name = r1?.object.name;
        if (r1Name === "coin") {
          r1.object.visible = false;
          this.coin += 1;
        }
        const c1 = r1Name && r1Name !== "coin";
        this.raycasterRight.ray.origin = origin;
        const r2 = this.raycasterRight.intersectObjects([
          intersectObstacal,
          intersectCoin,
        ])[0];
        const r2Name = r2?.object.name;
        if (r2Name === "coin") {
          r2.object.visible = false;
          this.coin += 1;
        }
        const c2 = r2Name && r2Name !== "coin";
        c1 || c2 ? (this.rightCollide = true) : (this.rightCollide = false);
        break;
      }
    }
  }

  changeStatus(delta: number) {
    if (!this.gameStart) {
      return;
    }
    const moveZ = this.runVelocity * delta;
    if (!this.frontCollide) {
      if (this.status !== playerStatus.DIE) {
        this.playerRunDistance += moveZ;
        this.model.position.z -= moveZ;
      }
    }
    if (this.status === playerStatus.DIE) {
      this.status = playerStatus.DIE;
    } else if (this.fallingSpeed > 0) {
      this.status = playerStatus.JUMP;
    } else if (this.fallingSpeed < 0 && this.key !== "ArrowDown") {
      this.status = playerStatus.FALL;
    } else if (this.roll) {
      this.status = playerStatus.ROLL;
    } else if (this.key === "p") {
      this.status = playerStatus.RUN;
    } else if (!this.roll && this.fallingSpeed === 0 && !this.runlookback) {
      this.status = playerStatus.RUN;
    } else if (this.runlookback) {
      this.status = playerStatus.RUNLOOKBACK;
    }

    if (this.status === this.lastAnimation) {
      return;
    }
    this.lastAnimation && this.allAnimate[this.lastAnimation].fadeOut(0.1);
    this.allAnimate[this.status].reset().fadeIn(0.1).play();
    this.lastAnimation = this.status;
  }

  checkPlayerDistance() {
    const ds = this.playerRunDistance;
    const nowPlane = Math.floor(ds / roadLength) + 1;
    const runToLength = (ds - roadLength * (nowPlane - 1)) / roadLength;
    if (runToLength > 0.45 && this.currentPlane !== nowPlane) {
      console.log("添加下一个地板");
      this.currentPlane = nowPlane;
      this.environement.z -= roadLength;
      const newZ = this.environement.z;
      this.environement.setGroupScene(newZ, -5 - nowPlane * roadLength, false);
    }
  }
  frontCollideCheckStatus() {
    if (this.frontCollide && this.firstFrontCollide.isCollide) {
      const currentTime = Date.now();

      // Prevent repeated collision processing
      if (currentTime - this.lastCollisionTime < this.COLLISION_COOLDOWN) {
        return;
      }

      this.lastCollisionTime = currentTime;
      const { object } = this.frontCollideInfo;
      const { y } = this.frontCollideInfo.point;
      const point = Number(y - 2);
      const obstacal = Number(Obstacal[object.name]?.y);
      const locateObstacal = point / obstacal;

      console.log("Obstacle", object.name, "% of Obstacles", locateObstacal);
      this.firstFrontCollide = { isCollide: false, name: object.name };

      if (locateObstacal < 0.75) {
        this.status = playerStatus.DIE;
        this.gameStatus = GAME_STATUS.END;
        showToast("You died! Press Spacebar to restart!");
        this.speakGameOver();
        this.game.emit("gameStatus", this.gameStatus);
      } else {
        this.fallingSpeed += 0.4;
        this.model.position.y += obstacal * (1 - locateObstacal);
        this.smallMistake += 1;
        this.emit("collision");
        showToast("Hit obstacle!");
        const obstacleType = this.firstFrontCollide.name || "unknown";
        this.speakObstacleWarning("Hit obstacle!", obstacleType, "ahead");
      }

      setTimeout(() => {
        this.firstFrontCollide.isCollide = true;
      }, 1000);
    }
  }

  coinRotate() {
    const ds = this.playerRunDistance;
    const nowPlane = Math.floor(ds / roadLength);
    const nowPlane1 = nowPlane + 1;
    const intersectCoin = this.environement.coin?.[nowPlane];
    const intersectCoin1 = this.environement.coin?.[nowPlane1];
    intersectCoin &&
      intersectCoin.traverse((mesh) => {
        if (mesh.name === "coin") {
          mesh.rotation.z += Math.random() * 0.1;
        }
      });
    intersectCoin1 &&
      intersectCoin1.traverse((mesh) => {
        if (mesh.name === "coin") {
          mesh.rotation.z += Math.random() * 0.1;
        }
      });
  }

  checkGameStatus() {
    const mistake = this.smallMistake;
    if (mistake >= 2 && this.gameStatus !== GAME_STATUS.END) {
      this.status = playerStatus.DIE;
      this.gameStatus = GAME_STATUS.END;
      this.game.emit("gameStatus", this.gameStatus);
      eyeTrackingController.setGameActive(false);
    }
  }

  checkTrainProximity() {
    if (!this.gameStart) return;

    const ds = this.playerRunDistance;
    const nowPlane = Math.floor(ds / roadLength);
    const currentObstacles = this.environement.obstacal?.[nowPlane];
    const nextObstacles = this.environement.obstacal?.[nowPlane + 1];
    [currentObstacles, nextObstacles].forEach((obstacleGroup, planeOffset) => {
      if (!obstacleGroup) return;

      obstacleGroup.traverse((child: any) => {
        if (child.name === "train" && child.isMesh) {
          const trainPosition = child.position;
          const playerPosition = this.model.position;

          const relativeDistance = Math.abs(trainPosition.z - playerPosition.z);
          const trainLane = this.getTrainLane(trainPosition.x);
          const playerLane = this.getCurrentLaneName();

          const trainId = `${trainPosition.x}_${Math.round(
            trainPosition.z
          )}_${planeOffset}`;

          // Use spatial audio controller for train proximity warnings
          spatialAudioController.announceTrainProximity(
            trainId,
            trainLane,
            playerLane,
            relativeDistance
          );
        }
      });
    });
  }

  private getLaneNumber(laneName: string): number {
    switch (laneName) {
      case "left":
        return 1;
      case "center":
        return 2;
      case "right":
        return 3;
      default:
        return 2;
    }
  }

  checkWallCollision() {
    this.raycasterLeft.set(this.model.position, new THREE.Vector3(-1, 0, 0));
    this.raycasterRight.set(this.model.position, new THREE.Vector3(1, 0, 0));

    if (this.leftCollide || this.rightCollide) {
      this.handleCollision();
    }
  }

  handleCollision() {
    const currentTime = Date.now();
    if (currentTime - this.lastSideCollisionTime >= this.COLLISION_COOLDOWN) {
      this.lastSideCollisionTime = currentTime;
    }
  }

  update(delta: number) {
    this.checkWallCollision();
    this.checkTrainProximity();
    this.changeStatus(delta);
    this.handleLeftRightMove();
    this.checkPlayerDistance();
    this.collideCheckAll();
    this.frontCollideCheckStatus();
    this.coinRotate();
    this.checkGameStatus();
    if (this.gameStatus === GAME_STATUS.START) {
      this.game.emit("gameData", {
        score: (this.score += 20),
        coin: this.coin,
        mistake: this.smallMistake,
      });
    }
    if (this.isJumping || !this.downCollide) {
      const ratio = 0.1;
      this.fallingSpeed += -9.2 * ratio * delta;
      this.model.position.add(new THREE.Vector3(0, this.fallingSpeed, 0));
    } else {
      this.fallingSpeed = 0;
    }
  }
}
