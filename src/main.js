import './style.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// ================= GLOBAL VARIABLES =================
let mixer, activeAction, grannyPivot;
let actions = {};
const clock = new THREE.Clock();
let isAttacking = false;

// Konfigurasi
const PLAYER_SPEED = 0.01;
const ATTACK_DISTANCE = 1.0;

// ================= UI KOORDINAT (X, Y, Z) =================
const infoDiv = document.createElement('div');
infoDiv.style.position = 'absolute';
infoDiv.style.top = '10px';
infoDiv.style.left = '10px';
infoDiv.style.color = '#00FF00'; 
infoDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
infoDiv.style.padding = '10px';
infoDiv.style.fontFamily = 'monospace';
infoDiv.style.fontSize = '14px';
infoDiv.style.pointerEvents = 'none';
infoDiv.style.zIndex = '100';
document.body.appendChild(infoDiv);

// ================= SCENE & RENDERER =================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // GELAP
scene.fog = new THREE.Fog(0x000000, 1, 15);   // KABUT PEKAT

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 0); 

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.4; // REDUPKAN LAYAR
document.body.appendChild(renderer.domElement);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

scene.add(new THREE.AmbientLight(0xffffff, 0.02)); // MINIM CAHAYA

const sunLight = new THREE.DirectionalLight(0xffffff, 0.05); // SINAR LEMAH
sunLight.position.set(5, 10, 7);
sunLight.castShadow = true;
scene.add(sunLight);

// ================= CONTROLS =================
const controls = new PointerLockControls(camera, renderer.domElement);
document.addEventListener('click', () => controls.lock());

// ================= ANIMATION SYSTEM =================
function fadeToAction(name, duration = 0.2) {
    if (!actions[name] || activeAction === actions[name]) return;
    if (activeAction) activeAction.fadeOut(duration);
    activeAction = actions[name];
    activeAction.reset().fadeIn(duration).play();
}

// ================= LOAD ASSETS =================
const loader = new GLTFLoader();

// 1. Load Rumah
loader.load('/granny_housegranny.glb', (gltf) => {
    const model = gltf.scene;
    model.scale.set(20, 20, 20);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    scene.add(model);
});

// 2. Load Granny
loader.load('/granny_animated.glb', (gltf) => {
    const grannyMesh = gltf.scene;
    grannyPivot = new THREE.Group();
    
    grannyPivot.position.set(0, -0.8, 0); 
    grannyMesh.scale.set(0.7, 0.7, 0.7);
    grannyMesh.rotation.y = -Math.PI / 2;
    grannyPivot.add(grannyMesh);
    scene.add(grannyPivot);

    mixer = new THREE.AnimationMixer(grannyMesh);
    
    gltf.animations.forEach((clip) => {
        const name = clip.name.toLowerCase();
        actions[name] = mixer.clipAction(clip);
    });

    const idleKey = Object.keys(actions).find(n => n.includes('idle'));
    if (idleKey) {
        activeAction = actions[idleKey];
        activeAction.play();
    }
});

// 3. Load Locker Door
loader.load('/locker_door_separated.glb', (gltf) => {
    const locker = gltf.scene;
    locker.position.set(-0.86, 1.40, -2.42);
    locker.rotation.y = Math.PI / 2;
    locker.scale.set(50, 50, 93);
    locker.traverse((child) => {
        // Jika anak objek adalah sebuah Mesh (memiliki geometri dan material)
        if (child.isMesh) {
            child.material.color.set(0xAB7F47);
        }
    });
    scene.add(locker);
});

//drawer kiri
loader.load('/drawer_of_blacksmith_table_-_a.glb', (gltf) => {
    const drawer = gltf.scene;
    drawer.position.set(1.9, 1.237, -0.65);
    // Skala disesuaikan agar terlihat di dalam rumah
    drawer.scale.set(0.14, 0.25, 0.15); 
    drawer.rotation.y = Math.PI;
    scene.add(drawer);
});

//drawer kanan
loader.load('/drawer_of_blacksmith_table_-_a.glb', (gltf) => {
    const drawer = gltf.scene;
    drawer.position.set(1.62, 1.237, -0.65);
    // Skala disesuaikan agar terlihat di dalam rumah
    drawer.scale.set(0.14, 0.25, 0.15); 
    drawer.rotation.y = Math.PI;
    scene.add(drawer);
});

//pintu kiri
loader.load('/door_granny.glb', (gltf) => {
    const door = gltf.scene;
    door.position.set(-1.04, 0.6, -0.47);
    
    door.rotation.y = Math.PI; 
    door.scale.set(0.046, 0.046, 0.04); 

    scene.add(door);
});

//pintu kanan
loader.load('/door_granny.glb', (gltf) => {
    const door = gltf.scene;
    door.position.set(0.995, 0.6, -0.47);
    
    door.rotation.y = Math.PI;
    door.scale.set(-0.046, 0.046, 0.04); 

    scene.add(door);
});

// vas bunga
loader.load('/granny_vase.glb', (gltf) => {
    const vase = gltf.scene;
    vase.position.set(-1.3, -0.3, -1.8);

    vase.scale.set(0.03, 0.03, 0.03); 

    scene.add(vase);
});

//kunci padlock
loader.load('/padlock__key.glb', (gltf) => {
    const root = gltf.scene;

    const keyMesh = root.getObjectByName('Key_Padlock_0'); 

    if (keyMesh) {
        keyMesh.position.set(-0.81, -0.05, 2.55); 
        
        keyMesh.scale.set(0.03, 0.03, 0.03); 

        scene.add(keyMesh);
    }
});

//padlock
loader.load('/padlock__key.glb', (gltf) => {
    const root = gltf.scene;

    // 1. Buat grup baru untuk menampung bagian-bagian gembok
    const padlockGroup = new THREE.Group();

    // 2. Ambil setiap bagian berdasarkan nama di log konsol kamu
    const body = root.getObjectByName('Padlock_Padlock_0');
    const cylinder = root.getObjectByName('Cylinder_Padlock_0');
    const shackle = root.getObjectByName('Shakle_Padlock_0'); // Sesuai log: Shakle (tanpa 'c')

    if (body) padlockGroup.add(body);
    if (cylinder) padlockGroup.add(cylinder);
    if (shackle) {
        shackle.position.set(0.64, 0, 0.6);
        padlockGroup.add(shackle);
    }

    padlockGroup.position.set(-0.4, 0, 2.605); 
    padlockGroup.rotation.x = -Math.PI / 2;
    padlockGroup.scale.set(0.03, 0.03, 0.03);
    
    scene.add(padlockGroup);
});

//atas
loader.load('/plank.glb', (gltf) => {
    const plank = gltf.scene;
    plank.position.set(-0.05, 0.4, 2.62); 
    plank.rotation.x = -Math.PI / 2; 
    plank.scale.set(3.5, 3, 3); 

    scene.add(plank);
});

//bawah
loader.load('/plank.glb', (gltf) => {
    const plank = gltf.scene;
    plank.position.set(-0.05, 0, 2.62); 
    plank.rotation.x = -Math.PI / 2; 
    plank.scale.set(3.5, 3, 3); 

    scene.add(plank);
});


// ================= INPUT SYSTEM =================
const keyState = {};
document.addEventListener('keydown', (e) => keyState[e.code] = true);
document.addEventListener('keyup', (e) => keyState[e.code] = false);

function handleMovement() {
    if (!controls.isLocked) return;
    if (keyState['KeyW']) controls.moveForward(PLAYER_SPEED);
    if (keyState['KeyS']) controls.moveForward(-PLAYER_SPEED);
    if (keyState['KeyA']) controls.moveRight(-PLAYER_SPEED);
    if (keyState['KeyD']) controls.moveRight(PLAYER_SPEED);
    
    if (keyState['Space']) camera.position.y += 0.01;
    if (keyState['ShiftLeft']) camera.position.y -= 0.01;
}

// ================= MAIN LOOP =================
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (mixer) mixer.update(delta);

    // 1. UPDATE DISPLAY KOORDINAT
    const x = camera.position.x.toFixed(2);
    const y = camera.position.y.toFixed(2);
    const z = camera.position.z.toFixed(2);
    infoDiv.innerText = `KOORDINAT PLAYER - X: ${x} | Y: ${y} | Z: ${z}`;

    // 2. LOGIKA GRANNY
    if (grannyPivot) {
        const distance = grannyPivot.position.distanceTo(camera.position);
        grannyPivot.lookAt(camera.position.x, grannyPivot.position.y, camera.position.z);

        if (distance < ATTACK_DISTANCE) {
            if (!isAttacking) {
                isAttacking = true;
                const hitKey = Object.keys(actions).find(n => n.includes('hit') && !n.includes('arrow'));
                if (hitKey) {
                    fadeToAction(hitKey, 0.1);
                    setTimeout(() => { 
                        isAttacking = false; 
                        const idleKey = Object.keys(actions).find(n => n.includes('idle'));
                        if (idleKey) fadeToAction(idleKey, 0.5);
                    }, 1500); 
                }
            }
        }
    }

    handleMovement();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();