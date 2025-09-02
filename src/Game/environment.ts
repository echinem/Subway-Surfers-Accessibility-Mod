import Game from ".";
import * as THREE from "three";
import { textureload, load3DModel } from "../Game/utils/model";
import { shuffleArray } from "../Game/utils/random";

export const roadWidth = 15;
export const roadLength = 330;
const threeRoad = [-roadWidth / 3, 0, roadWidth / 3];
const [house1SceneX, house1SceneY, house1RightRotation] = [
  roadWidth * 1.9,
  0,
  Math.PI,
];
const [house2SceneX, house2SceneY, house2RightRotation] = [
  roadWidth * 1.6,
  0,
  Math.PI,
];
const [house3SceneX, house3SceneY, house3RightRotation] = [
  roadWidth * 1.08,
  10,
  Math.PI / 2,
];
const [house4SceneX, house4SceneY, house4RightRotation] = [
  roadWidth * 1.5,
  0,
  Math.PI,
];
const [house5SceneX, house5SceneY, house5RightRotation] = [
  roadWidth * 1.2,
  0,
  Math.PI,
];

export default class Environment {
  static instance: Environment;
  game!: Game;
  scene: THREE.Scene = new THREE.Scene();
  planeGroup: THREE.Group = new THREE.Group();
  plane: THREE.Object3D[] = [];
  obstacal: THREE.Object3D[] = [];
  coin: THREE.Object3D[] = [];
  z!: number;
  house1Scene: any;
  house2Scene: any;
  house3Scene: any;
  house4Scene: any;
  house5Scene: any;
  listener!: THREE.AudioListener;
  audioLoader!: THREE.AudioLoader;
  trainSounds: THREE.PositionalAudio[] = [];

  trainPositions: Map<string, { position: THREE.Vector3; announced: boolean }> =
    new Map();

  constructor() {
    if (Environment.instance) {
      return Environment.instance;
    }
    Environment.instance = this;

    this.game = new Game();
    this.listener = new THREE.AudioListener();
    this.game.camera.getCamera().add(this.listener);
    this.audioLoader = new THREE.AudioLoader();
    this.scene = this.game.scene;
    this.z = -1 * (roadLength / 2) + 10;
    this.startGame();
  }

  startGame() {
    this.trainSounds.forEach((sound) => {
      sound.stop();
      sound.disconnect();
    });
    this.trainSounds = [];

    this.trainPositions.clear();

    this.plane = [];
    this.obstacal = [];
    this.z = -1 * (roadLength / 2) + 10;
    this.coin = [];
    this.setAmbientLight();
    this.setGroupScene(this.z, -5, true);
  }

  setGroupScene(z: number, houseZ: number, isloadAgain: boolean) {
    const modelGroup = new THREE.Group();
    this.setPlane(modelGroup, z);
    this.loadmodelAndSize(modelGroup, houseZ, isloadAgain);
    this.loadObstacle(modelGroup, houseZ);
    this.scene.add(modelGroup);
  }

  setAmbientLight() {
    const ambientLight = new THREE.AmbientLight(0xffffff);
    ambientLight.position.set(0, 10, 0);
    this.scene.add(ambientLight);
  }

  async setPlane(modelGroup: THREE.Group, z: number) {
    this.planeGroup = new THREE.Group();
    const [planeTexure, planeTexure1] = await Promise.all([
      await textureload("/assets/png/railway_texture.png"),
      await textureload("/assets/png/stone.png"),
    ]);
    planeTexure.colorSpace = THREE.SRGBColorSpace;
    planeTexure.rotation = -Math.PI / 2;
    planeTexure.wrapS = THREE.RepeatWrapping;
    planeTexure.wrapT = THREE.RepeatWrapping;
    planeTexure.repeat.set(roadWidth * 3, 3);
    const planGeometry = new THREE.PlaneGeometry(roadWidth, roadLength, 1, 1);
    const planMaterial = new THREE.MeshPhongMaterial({
      map: planeTexure,
    });
    const plane = new THREE.Mesh(planGeometry, planMaterial);
    plane.name = "plane";
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(0, 0, z);
    plane.receiveShadow = true;
    plane.castShadow = true;
    this.plane.push(plane);
    planeTexure1.rotation = -Math.PI / 2;
    planeTexure1.wrapS = THREE.RepeatWrapping;
    planeTexure1.wrapT = THREE.RepeatWrapping;
    planeTexure1.repeat.set(120, 30);
    const planGeometry1 = new THREE.PlaneGeometry(60, roadLength);
    const planMaterial1 = new THREE.MeshBasicMaterial({
      map: planeTexure1,
    });
    const plane1 = new THREE.Mesh(planGeometry1, planMaterial1);
    plane1.rotation.x = -Math.PI / 2;
    plane1.position.set(0, -0.01, z);
    const planGeometry2 = new THREE.PlaneGeometry(60, roadLength);
    const planMaterial2 = new THREE.MeshBasicMaterial({});
    const plane2 = new THREE.Mesh(planGeometry2, planMaterial2);
    plane2.position.set(roadWidth / 2, 3, -1 * (roadLength / 2) + 10);
    const plane3 = new THREE.Mesh(planGeometry2, planMaterial2);
    plane3.rotation.x = -Math.PI / 2;
    plane3.rotation.y = Math.PI / 2;
    plane3.position.set(-1 * (roadWidth / 2), 3, -1 * (roadLength / 2) + 10);
    modelGroup.add(plane);
    modelGroup.add(plane1);
  }

  async loadObstacle(modelGroup: THREE.Group, houseZ: number) {
    const obstacalGroup = new THREE.Group();
    const sceneGroup = new THREE.Group();

    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const trainAnnouncements: { [key: string]: HTMLAudioElement } = {};

    const laneNames = ["left", "center", "right"];

    for (let i = 0; i < 3; i++) {
      const audio = new Audio();
      audio.src = `/assets/audio/train_lane_${laneNames[i]}.mp3`;
      audio.preload = "auto";
      audio.volume = 0.8;
      trainAnnouncements[laneNames[i]] = audio;
    }

    const speakTrainApproaching = (laneName: string, isUrgent = false) => {
      if ("speechSynthesis" in window) {
        const message = isUrgent
          ? `URGENT! Train in ${laneName} lane!`
          : `Train approaching ${laneName} lane!`;

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = isUrgent ? 2.2 : 2.0;
        utterance.volume = 1.0;
        utterance.pitch = isUrgent ? 1.4 : 1.2;
        speechSynthesis.speak(utterance);
      }
    };

    const [{ scene: train }, { scene: coin }] = await Promise.all([
      await load3DModel("/assets/glb/train.glb"),
      await load3DModel("/assets/glb/coin.glb"),
    ]);
    this.setThingName(train, "train");
    const planGeometry1 = new THREE.PlaneGeometry(6, 22); // Increased width and length
    const planGeometry2 = new THREE.PlaneGeometry(6, 20); // Increased width and length
    const planGeometry3 = new THREE.PlaneGeometry(6, 18); // Additional collision plane
    const planMaterial = new THREE.MeshPhongMaterial({
      opacity: 0,
      transparent: true,
    });
    train.scale.set(0.3, 0.3, 0.3);
    const trainSizeZ = this.comupteBox(train).z;

    let obstacle = houseZ - 60;
    const availableLanes = [-1, 0, 1];
    let trainCount = 0;
    const maxTrainsPerSection = 6;

    while (obstacle > houseZ - roadLength && trainCount < maxTrainsPerSection) {
      const randomLaneIndex = Math.floor(Math.random() * availableLanes.length);
      const selectedLane = availableLanes[randomLaneIndex];
      const roadIndex = selectedLane + 1;

      if (roadIndex >= 0 && roadIndex < threeRoad.length) {
        const trainMesh = this.cloneModel(
          train,
          threeRoad[roadIndex],
          0,
          obstacle,
          Math.PI,
          obstacalGroup
        );

        trainMesh.userData = {
          trainId: `train_${trainCount}_${roadIndex}_${obstacle}`,
          lane: selectedLane,
          initialZ: obstacle,
        };

        const trainKey = `${threeRoad[roadIndex]}_${obstacle}`;
        this.trainPositions.set(trainKey, {
          position: new THREE.Vector3(threeRoad[roadIndex], 0, obstacle),
          announced: false,
        });

        const plane1 = new THREE.Mesh(planGeometry1, planMaterial);
        const plane2 = new THREE.Mesh(planGeometry2, planMaterial);
        const plane3 = new THREE.Mesh(planGeometry3, planMaterial); // Additional plane

        plane1.rotation.x = -Math.PI / 2;
        plane2.rotation.x = -Math.PI / 2;
        plane3.rotation.x = -Math.PI / 2;

        plane1.position.set(threeRoad[roadIndex], 8.5, obstacle); // Slightly higher
        plane2.position.set(threeRoad[roadIndex], 8.0, obstacle); // Middle height
        plane3.position.set(threeRoad[roadIndex], 7.5, obstacle); // Lower height

        plane1.name = "train";
        plane2.name = "train";
        plane3.name = "train";

        plane1.userData = trainMesh.userData;
        plane2.userData = trainMesh.userData;
        plane3.userData = trainMesh.userData;
        const sideGeometry = new THREE.PlaneGeometry(2, 15);
        const leftSidePlane = new THREE.Mesh(sideGeometry, planMaterial);
        const rightSidePlane = new THREE.Mesh(sideGeometry, planMaterial);

        leftSidePlane.rotation.y = Math.PI / 2;
        rightSidePlane.rotation.y = -Math.PI / 2;

        leftSidePlane.position.set(threeRoad[roadIndex] - 1.5, 8, obstacle);
        rightSidePlane.position.set(threeRoad[roadIndex] + 1.5, 8, obstacle);

        leftSidePlane.name = "train";
        rightSidePlane.name = "train";
        leftSidePlane.userData = trainMesh.userData;
        rightSidePlane.userData = trainMesh.userData;

        obstacalGroup.add(
          plane1,
          plane2,
          plane3,
          leftSidePlane,
          rightSidePlane
        );

        trainCount++;
      }

      obstacle -= trainSizeZ + 40;
    }

    // Coin placement
    let coinBlock = houseZ - 5;
    let z = -1;
    let increase2 = true;
    coin.scale.set(10, 10, 10);
    coin.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material.emissive = child.material.color;
        child.material.emissiveMap = child.material.map;
        child.material.metalness = 0;
      }
    });
    this.setThingName(coin, "coin");

    while (coinBlock > houseZ - roadLength) {
      if (z >= -1 && z < 1 && increase2) {
        z++;
      } else if (z === 1) {
        increase2 = false;
        z--;
      } else if (!increase2) {
        z--;
        if (z === -1) {
          increase2 = true;
        }
      }

      const coinRoadIndex = z + 1;
      if (coinRoadIndex >= 0 && coinRoadIndex < threeRoad.length) {
        this.cloneModel(
          coin,
          threeRoad[coinRoadIndex],
          1.5,
          coinBlock,
          Math.PI,
          sceneGroup
        );
      }

      const randomInt = Math.floor(Math.random() * (4 - 2 + 1)) + 2;
      coinBlock -= randomInt;
    }

    this.obstacal.push(obstacalGroup);
    this.coin.push(sceneGroup);
    modelGroup.add(obstacalGroup, sceneGroup);
  }

  async loadmodelAndSize(
    modelGroup: THREE.Group,
    houseZ: number,
    load: boolean
  ) {
    if (load) {
      const [
        { scene: house1Scene },
        { scene: house2Scene },
        { scene: house3Scene },
        { scene: house4Scene },
        { scene: house5Scene },
      ] = await Promise.all([
        await load3DModel("/assets/glb/house1.glb"),
        await load3DModel("/assets/glb/house2.glb"),
        await load3DModel("/assets/glb/house3.glb"),
        await load3DModel("/assets/glb/house4.glb"),
        await load3DModel("/assets/glb/house5.glb"),
      ]);
      console.log("Building model loading completed");
      this.house1Scene = house1Scene;
      this.house2Scene = house2Scene;
      this.house3Scene = house3Scene;
      this.house4Scene = house4Scene;
      this.house5Scene = house5Scene;
    }

    const house1Scene = this.house1Scene.clone();
    const house2Scene = this.house2Scene.clone();
    const house3Scene = this.house3Scene.clone();
    const house4Scene = this.house4Scene.clone();
    const house5Scene = this.house5Scene.clone();

    // House setup (unchanged)
    house1Scene.scale.set(0.03, 0.03, 0.02);
    house1Scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material.emissive = child.material.color;
        child.material.emissiveMap = child.material.map;
      }
    });
    house1Scene.rotateY(-Math.PI / 2);
    house1Scene.position.set(roadWidth * 1.8, 0, houseZ - 5);
    const house1Size = this.comupteBox(house1Scene);

    house2Scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    house2Scene.scale.set(3, 3, 2);
    house2Scene.rotateY(Math.PI / 2);
    house2Scene.position.set(-roadWidth * 1.575, 0, houseZ - 10);
    const house2Size = this.comupteBox(house2Scene);

    house3Scene.scale.set(10, 10, 8);
    house3Scene.rotateY(Math.PI);
    const house3Size = this.comupteBox(house3Scene);

    house4Scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material.emissive = child.material.color;
        child.material.emissiveMap = child.material.map;
      }
    });
    house4Scene.rotateY((Math.PI / 2) * 2);
    house4Scene.scale.set(11, 11, 10);
    house4Scene.position.set(-roadWidth * 1.43, 0, houseZ - 35);
    const house4Size = this.comupteBox(house4Scene);

    house5Scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material.emissive = child.material.color;
        child.material.emissiveMap = child.material.map;
      }
    });
    house5Scene.scale.set(0.1, 0.08, 0.1);
    house5Scene.rotateY(-Math.PI);
    house5Scene.position.set(roadWidth * 1.16, 0, houseZ - 35);
    const house5Size = this.comupteBox(house5Scene);

    const randomArray = [
      { name: "house1Scene", scene: house1Scene },
      { name: "house2Scene", scene: house2Scene },
      { name: "house3Scene", scene: house3Scene },
      { name: "house4Scene", scene: house4Scene },
      { name: "house5Scene", scene: house5Scene },
    ];
    const sceneMap: any = {
      house1Scene: house1Size,
      house2Scene: house2Size,
      house3Scene: house3Size,
      house4Scene: house4Size,
      house5Scene: house5Size,
    };

    // Right side houses
    let j = 0;
    let rightStartHouse = houseZ;
    while (rightStartHouse > houseZ - roadLength) {
      const { name, scene } = shuffleArray(randomArray)[3];
      if (j !== 0) {
        rightStartHouse = rightStartHouse - Math.abs(sceneMap[name].z);
      }
      if (scene === house1Scene) {
        this.cloneModel(
          scene,
          house1SceneX,
          house1SceneY,
          rightStartHouse,
          0,
          modelGroup
        );
      } else if (scene === house2Scene) {
        this.cloneModel(
          scene,
          house2SceneX,
          house2SceneY,
          rightStartHouse,
          0,
          modelGroup
        );
      } else if (scene === house3Scene) {
        this.cloneModel(
          scene,
          house3SceneX,
          house3SceneY,
          rightStartHouse,
          0,
          modelGroup
        );
      } else if (scene === house4Scene) {
        this.cloneModel(
          scene,
          house4SceneX,
          house4SceneY,
          rightStartHouse,
          0,
          modelGroup
        );
      } else if (scene === house5Scene) {
        this.cloneModel(
          scene,
          house5SceneX,
          house5SceneY,
          rightStartHouse,
          0,
          modelGroup
        );
      }
      j++;
      rightStartHouse -= Math.abs(sceneMap[name].z) - 20;
    }

    // Left side houses
    let n = 0;
    let leftStartHouse = houseZ;
    while (leftStartHouse > houseZ - roadLength) {
      const { name, scene } = shuffleArray(randomArray)[3];
      if (n !== 0) {
        leftStartHouse = leftStartHouse - Math.abs(sceneMap[name].z);
      }
      if (scene === house1Scene) {
        this.cloneModel(
          scene,
          -1 * house1SceneX,
          house1SceneY,
          leftStartHouse,
          house1RightRotation,
          modelGroup
        );
      } else if (scene === house2Scene) {
        this.cloneModel(
          scene,
          -1 * house2SceneX,
          house2SceneY,
          leftStartHouse,
          house2RightRotation,
          modelGroup
        );
      } else if (scene === house3Scene) {
        this.cloneModel(
          scene,
          -1 * house3SceneX,
          house3SceneY,
          leftStartHouse,
          house3RightRotation,
          modelGroup
        );
      } else if (scene === house4Scene) {
        this.cloneModel(
          scene,
          -1 * house4SceneX,
          house4SceneY,
          leftStartHouse,
          house4RightRotation,
          modelGroup
        );
      } else if (scene === house5Scene) {
        this.cloneModel(
          scene,
          -1 * house5SceneX,
          house5SceneY,
          leftStartHouse,
          house5RightRotation,
          modelGroup
        );
      }
      n++;
      leftStartHouse -= Math.abs(sceneMap[name].z) - 20;
    }
  }

  comupteBox(scene: THREE.Group) {
    const boundingBox = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    const modelWidth = size.x;
    const modelHeight = size.y;
    const modelDepth = size.z;
    const modelSize = {
      x: modelWidth,
      y: modelHeight,
      z: modelDepth,
      center: new THREE.Vector3(modelWidth / 2, 0, modelDepth / 2),
    };
    return modelSize;
  }

  setThingName(group: THREE.Group, name = "") {
    group.traverse((child: any) => {
      if (child.isMesh) {
        child.name = name;
      }
    });
  }

  cloneModel(
    obj: any,
    x: number,
    y: number,
    z: number,
    rotation: number,
    scene: THREE.Group,
    collision?: false
  ) {
    const cloneObj = obj.clone();
    cloneObj.children.map((v: any, i: number) => {
      if (v.material) {
        // @ts-ignore
        v.material = obj.children[i].material.clone();
      }
    });
    rotation && cloneObj.rotateY(rotation);
    cloneObj.position.set(x, y, z);
    if (collision) {
    }
    scene.add(cloneObj);
    return cloneObj;
  }
}
