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
const dummyTarget = new THREE.Object3D(); 
const targetPos = new THREE.Vector3();

// --- GLOBAL VARIABLES UNTUK FISIKA VAS ---
let vase; 
let vaseVelocityY = -0.0005; 
const GRAVITY = 0; 
let isTumbling = false; // <--- STATUS BARU: Apakah vas sedang terguling?
let rollSpeed = 0;

// 1. Variabel global untuk menyimpan referensi
let doorHinge;
let door;
let isOpen = false;

let drawerLeft, drawerRight;
let isDrawerOpen = false;

let lockerHinge;

// Konfigurasi
const PLAYER_SPEED = 0.01;
const ATTACK_DISTANCE = 1.0;

//padlock
let padlockGroup;
let isPadlockFalling = false;
let padlockVelocityY = 0;

// Variabel untuk Papan (Plank)
let plankVelocity = 0;
let isPlankDrop = false;
let plankPivot;

// ================= UI KOORDINAT =================
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
scene.background = new THREE.Color(0x000000); 
scene.fog = new THREE.Fog(0x000000, 1, 15); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(-1.47, -0.53, -1.34); 
camera.lookAt(-1.46, -0.38, -1.70);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.15; 
document.body.appendChild(renderer.domElement);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

scene.add(new THREE.AmbientLight(0xffffff, 0.02)); 

const sunLight = new THREE.DirectionalLight(0xffffff, 0.05); 
sunLight.position.set(5, 10, 7);
sunLight.castShadow = true;
scene.add(sunLight);

// =========================================================
// LIGHTING SETUP (LAMPU + BLOCKER)
// =========================================================

// --- DEFINISI MATERIAL BLOCKER (Dipakai Bersama) ---
// Kita pakai satu geometri & material untuk semua blocker (hemat memori)
const blockerGeometry = new THREE.BoxGeometry(4, 0.1, 4); 
const blockerMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
blockerMaterial.colorWrite = false; // Invisible
blockerMaterial.depthWrite = false; 

// ---------------------------------------------------------
// SET 1: Kiri (-1.8, -1.6)
// ---------------------------------------------------------
const bulbLight1 = new THREE.PointLight(0xFFFFFF, 10, 5); 
bulbLight1.position.set(-1.8, 0.4, -1.6); 
bulbLight1.castShadow = false; 
bulbLight1.shadow.mapSize.set(1024, 1024);
bulbLight1.shadow.camera.near = 0.1;
bulbLight1.shadow.bias = -0.0005;
scene.add(bulbLight1);

const blocker1 = new THREE.Mesh(blockerGeometry, blockerMaterial);
blocker1.position.set(-1.8, 0.6, -1.6); // Posisi di atas lampu
blocker1.castShadow = false;
blocker1.receiveShadow = false;
scene.add(blocker1);

// ---------------------------------------------------------
// SET 2: Kanan (1.8, -1.6)
// ---------------------------------------------------------
const bulbLight2 = new THREE.PointLight(0xFFFFFF, 10, 5); 
bulbLight2.position.set(1.8, 0.4, -1.6); 
bulbLight2.castShadow = false; 
bulbLight2.shadow.mapSize.set(1024, 1024);
bulbLight2.shadow.camera.near = 0.1;
bulbLight2.shadow.bias = -0.0005;
scene.add(bulbLight2);

const blocker2 = new THREE.Mesh(blockerGeometry, blockerMaterial);
blocker2.position.set(1.8, 0.6, -1.6);
blocker2.castShadow = false;
blocker2.receiveShadow = false;
scene.add(blocker2);

// ---------------------------------------------------------
// SET 3: Tambahan (2.6, 1.05)
// ---------------------------------------------------------
const bulbLight3 = new THREE.PointLight(0xFFFFFF, 5, 5); 
bulbLight3.position.set(2.6, 0.4, 1.05); 
bulbLight3.castShadow = false; 
bulbLight3.shadow.mapSize.set(1024, 1024); // Resolusi tinggi biar tidak bocor
bulbLight3.shadow.camera.near = 0.1;
bulbLight3.shadow.bias = -0.0005;
scene.add(bulbLight3);

const blocker3 = new THREE.Mesh(blockerGeometry, blockerMaterial);
blocker3.position.set(2.6, 0.6, 1.05); // Y=0.6 (Di atas lampu)
blocker3.castShadow = false;
blocker3.receiveShadow = false;
scene.add(blocker3);

// ---------------------------------------------------------
// SET 4: Kiri Depan (-2.6, 1.2)
// ---------------------------------------------------------
const bulbLight4 = new THREE.PointLight(0xFFFFFF, 5, 5); 
bulbLight4.position.set(-2.6, 0.4, 1.2); 
bulbLight4.castShadow = false; 
bulbLight4.shadow.mapSize.set(1024, 1024); 
bulbLight4.shadow.camera.near = 0.1;
bulbLight4.shadow.bias = -0.0005;
scene.add(bulbLight4);

const blocker4 = new THREE.Mesh(blockerGeometry, blockerMaterial);
blocker4.position.set(-2.6, 0.6, 1.2); 
blocker4.castShadow = false;
blocker4.receiveShadow = false;
scene.add(blocker4);

// ---------------------------------------------------------
// SET 5: Tengah Atas (-0.15, 1.8, 1.4)
// ---------------------------------------------------------
// Tanpa blocker sesuai permintaan
const bulbLight5 = new THREE.PointLight(0xFFFFFF, 15, 5); 
bulbLight5.position.set(-0.15, 1.8, 1.4); 
bulbLight5.castShadow = false; 
bulbLight5.shadow.mapSize.set(1024, 1024); 
bulbLight5.shadow.camera.near = 0.1;
bulbLight5.shadow.bias = -0.0005;
scene.add(bulbLight5);

// ---------------------------------------------------------
// SET 6: Tengah Atas (-2.8, 1.8, 1.3)
// ---------------------------------------------------------
// Tanpa blocker sesuai permintaan
const bulbLight6 = new THREE.PointLight(0xFFFFFF, 5, 5); 
bulbLight6.position.set(-2.6, 1.8, 1.3); 
bulbLight6.castShadow = false; 
bulbLight6.shadow.mapSize.set(1024, 1024); 
bulbLight6.shadow.camera.near = 0.1;
bulbLight6.shadow.bias = -0.0005;
scene.add(bulbLight6);

// ---------------------------------------------------------
// SET 7: Tengah Atas (-2.1, 1.8, -1.6)
// ---------------------------------------------------------
// Tanpa blocker sesuai permintaan
const bulbLight7 = new THREE.PointLight(0xFFFFFF, 7.5, 5); 
bulbLight7.position.set(-2.1, 1.8, -1.6); 
bulbLight7.castShadow = false; 
bulbLight7.shadow.mapSize.set(1024, 1024); 
bulbLight7.shadow.camera.near = 0.1;
bulbLight7.shadow.bias = -0.0005;
scene.add(bulbLight7);

// ---------------------------------------------------------
// SET 8: Tengah Atas (1.5, 1.8, -1.75)
// ---------------------------------------------------------
// Tanpa blocker sesuai permintaan
const bulbLight8 = new THREE.PointLight(0xFFFFFF, 7.5, 5); 
bulbLight8.position.set(1.5, 1.8, -1.75); 
bulbLight8.castShadow = false; 
bulbLight8.shadow.mapSize.set(1024, 1024); 
bulbLight8.shadow.camera.near = 0.1;
bulbLight8.shadow.bias = -0.0005;
scene.add(bulbLight8);

// ---------------------------------------------------------
// SET 9: Tengah Atas (3.5, 1.8, -1.5)
// ---------------------------------------------------------
// Tanpa blocker sesuai permintaan
const bulbLight9 = new THREE.PointLight(0xFFFFFF, 2.5, 5); 
bulbLight9.position.set(3.5, 1.8, -1.5); 
bulbLight9.castShadow = false; 
bulbLight9.shadow.mapSize.set(1024, 1024); 
bulbLight9.shadow.camera.near = 0.1;
bulbLight9.shadow.bias = -0.0005;
scene.add(bulbLight9);

// ---------------------------------------------------------
// SET 10: Tambahan (2.6, 1.8, 1.05)
// ---------------------------------------------------------
const bulbLight10 = new THREE.PointLight(0xFFFFFF, 5, 5); 
bulbLight10.position.set(2.6, 1.8, 1.05); 
bulbLight10.castShadow = false; 
bulbLight10.shadow.mapSize.set(1024, 1024); // Resolusi tinggi biar tidak bocor
bulbLight10.shadow.camera.near = 0.1;
bulbLight10.shadow.bias = -0.0005;
scene.add(bulbLight10);

// (Opsional) Helper untuk melihat posisi semua lampu
// const debugHelper1 = new THREE.CameraHelper(bulbLight1.shadow.camera);
// const debugHelper2 = new THREE.CameraHelper(bulbLight2.shadow.camera);
// const debugHelper3 = new THREE.CameraHelper(bulbLight3.shadow.camera);
// scene.add(debugHelper1);
// scene.add(debugHelper2);
// scene.add(debugHelper3);


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

// ================= CUSTOM OBJECTS =================
const flatBoxGeometry = new THREE.BoxGeometry(0.75, 0.025, 1.5); 

// --- BALOK 1 (Invisible / Meja Bawah) ---
const flatBoxMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8B4513, 
    roughness: 0.9, 
    visible: false, 
});
const flatBox = new THREE.Mesh(flatBoxGeometry, flatBoxMaterial);
flatBox.position.set(-2.03, -0.31, -1.75);
scene.add(flatBox);

flatBox.updateMatrixWorld(true); 
const flatBoxBB = new THREE.Box3().setFromObject(flatBox);
const SURFACE_1_Y = flatBoxBB.max.y; 

// --- BALOK 2 (Visible / Rak Atas) ---
const flatBoxMaterialVisible = new THREE.MeshStandardMaterial({ 
    color: 0x8B4513, 
    roughness: 0.9, 
    visible: false, 
});
const flatBox2 = new THREE.Mesh(flatBoxGeometry, flatBoxMaterialVisible);
flatBox2.position.set(-1.6, -0.73, -1.75); 
scene.add(flatBox2);

flatBox2.updateMatrixWorld(true);
const flatBox2BB = new THREE.Box3().setFromObject(flatBox2);
const SURFACE_2_Y = flatBox2BB.max.y;


// ================= LOAD ASSETS =================
const loader = new GLTFLoader();

// 1. Load Rumah
loader.load('/granny_housegranny.glb', (gltf) => {
    const model = gltf.scene;
    model.scale.set(20, 20, 20);
    
    // --- TAMBAHAN PENTING ---
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;    // Agar tembok menghalangi cahaya (bikin bayangan)
            child.receiveShadow = true; // Agar tembok bisa kena bayangan
            
            // PENTING: Agar cahaya tidak tembus dinding tipis (backface culling)
            child.material.side = THREE.DoubleSide; 
            child.material.shadowSide = THREE.DoubleSide; 
        }
    });
    // ------------------------

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    scene.add(model);
});

// 2. Load Granny
loader.load('/granny_animated.glb', (gltf) => {
    const grannyMesh = gltf.scene;
    console.groupEnd();
    grannyPivot = new THREE.Group();
    grannyPivot.position.set(-0.65, -1.93, 0); 
    grannyMesh.scale.set(0.7, 0.7, 0.7);
    grannyMesh.rotation.y = -Math.PI / 2;
    grannyPivot.add(grannyMesh);
    scene.add(grannyPivot);

    mixer = new THREE.AnimationMixer(grannyMesh);
    gltf.animations.forEach((clip) => {
        const name = clip.name.toLowerCase();
        actions[name] = mixer.clipAction(clip);
    });

    const idleKey = Object.keys(actions).find(n => n.includes('idle_1'));
    if (idleKey) {
        activeAction = actions[idleKey];
        activeAction.play();
    }
});

// 3. Load Locker Door
loader.load('/locker_door_separated.glb', (gltf) => {
    const lockerMesh = gltf.scene;
    
    lockerHinge = new THREE.Group();
    lockerMesh.position.set(0.0002, 0, 0); 
    
    lockerHinge.add(lockerMesh);

    lockerHinge.position.set(-0.58 , 1.40, -2.415);
    lockerHinge.rotation.y = -Math.PI * 0.5;
    lockerHinge.scale.set(50, 50, 95);
    
    lockerMesh.traverse((child) => {
        if (child.isMesh) child.material.color.set(0xAB7F47);
    });
    
    scene.add(lockerHinge);
});

// drawer kiri
loader.load('/drawer_of_blacksmith_table_-_a.glb', (gltf) => {
    drawerLeft = gltf.scene; // Hapus 'const', gunakan variabel global
    drawerLeft.position.set(1.9, 1.237, -0.65);
    drawerLeft.scale.set(0.14, 0.25, 0.15); 
    drawerLeft.rotation.y = Math.PI;
    scene.add(drawerLeft);
});

// drawer kanan
loader.load('/drawer_of_blacksmith_table_-_a.glb', (gltf) => {
    drawerRight = gltf.scene; // Hapus 'const', gunakan variabel global
    drawerRight.position.set(1.62, 1.237, -0.65);
    drawerRight.scale.set(0.14, 0.25, 0.15);
    drawerRight.rotation.y = Math.PI;
    scene.add(drawerRight);
});

// pintu kiri
loader.load('/door_granny.glb', (gltf) => {
    const door = gltf.scene;
    door.position.set(-0.35, 0.6, -0.47);
    door.rotation.y = -Math.PI * 0.5; 
    door.scale.set(0.046, 0.046, 0.04); 
    scene.add(door);
});

// pintu kanan
loader.load('/door_granny.glb', (gltf) => {
    const doorMesh = gltf.scene;
    doorHinge = new THREE.Group();
    doorMesh.position.set(0.5, 0, 0); 
    doorHinge.add(doorMesh);
    doorHinge.position.set(0.995, 0.6, -0.47);
    doorHinge.rotation.y = Math.PI;
    doorHinge.scale.set(-0.048, 0.046, 0.04); 
    
    scene.add(doorHinge);
});

// --- LOAD VAS BUNGA ---
loader.load('/granny_vase.glb', (gltf) => {
    const rawModel = gltf.scene;

    // ===============================================
    // UPDATE: AKTIFKAN SHADOW UNTUK VAS
    // ===============================================
    rawModel.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;    // Vas akan membuat bayangan di lantai/meja
            child.receiveShadow = true; // Vas bisa kena bayangan (self-shadowing)
        }
    });
    // ===============================================

    const rawBox = new THREE.Box3().setFromObject(rawModel);
    const center = rawBox.getCenter(new THREE.Vector3());
    const bottomY = rawBox.min.y;

    rawModel.position.x -= center.x;
    rawModel.position.y -= bottomY; 
    rawModel.position.z -= center.z;

    vase = new THREE.Group();
    vase.add(rawModel); 

    vase.scale.set(0.03, 0.03, 0.03);
    
    // Spawn di TENGAH Balok 1 (-2.03)
    vase.position.set(-1.66, 0, -1.75); 
    
    scene.add(vase);

    // Helper sumbu (opsional, boleh dihapus kalau mengganggu visual)
    const axesHelper = new THREE.AxesHelper(0.5);
    vase.add(axesHelper);
});

// kunci padlock
loader.load('/padlock__key.glb', (gltf) => {
    const root = gltf.scene;
    const keyMesh = root.getObjectByName('Key_Padlock_0'); 
    if (keyMesh) {
        keyMesh.position.set(-0.81, -0.05, 2.55); 
        keyMesh.scale.set(0.03, 0.03, 0.03); 
        scene.add(keyMesh);
    }
});

// padlock
loader.load('/padlock__key.glb', (gltf) => {
    const root = gltf.scene;
    padlockGroup = new THREE.Group();
    const body = root.getObjectByName('Padlock_Padlock_0');
    const cylinder = root.getObjectByName('Cylinder_Padlock_0');
    const shackle = root.getObjectByName('Shakle_Padlock_0'); 

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
function updateFallingInteractions() {
    const GROUND_Y = -0.77;

    if (padlockGroup) {

        if (isPadlockFalling) {
            padlockVelocityY -= 0.001;
            padlockGroup.position.y += padlockVelocityY;
            if (padlockGroup.position.y <= GROUND_Y) {
                padlockGroup.position.y = GROUND_Y;
                padlockVelocityY = 0;
            }
        }
    }
}

// plank atas
loader.load('/plank.glb', (gltf) => {
    const plankMesh = gltf.scene;

    plankPivot = new THREE.Group();
    // Posisi engsel di KANAN
    plankPivot.position.set(0.34, 0, 2.62); 

    const axesHelper = new THREE.AxesHelper(2);
    plankPivot.add(axesHelper);

    plankPivot.add(plankMesh);
    // Mesh digeser ke KIRI dari engsel
    plankMesh.position.set(-0.37, 0.4, 0); 

    plankMesh.rotation.x = -Math.PI / 2; 
    plankMesh.scale.set(3.5, 3, 3); 

    scene.add(plankPivot);
});

function updatePlankPhysics() {
    // Cek apakah pivot sudah ada dan trigger sudah aktif
    if (!plankPivot || !isPlankDrop) return;

    // TARGET: 90 Derajat Positif (Jatuh ke Kiri Bawah / Berlawanan jarum jam)
    const targetRotation = Math.PI / 2; 

    if (plankPivot.rotation.z < targetRotation) {
        plankVelocity += 0.0015; 
        plankPivot.rotation.z += plankVelocity; 

        // Stop dan efek membal
        if (plankPivot.rotation.z > targetRotation) {
            plankPivot.rotation.z = targetRotation;
            plankVelocity = -plankVelocity * 0.3; 
            
            if (Math.abs(plankVelocity) < 0.001) {
                plankVelocity = 0;
            }
        }
    }
}

// plank bawah
loader.load('/plank.glb', (gltf) => {
    const plank = gltf.scene;
    plank.position.set(-0.05, 0, 2.62); 
    plank.rotation.x = -Math.PI / 2; 
    plank.scale.set(3.5, 3, 3); 
    scene.add(plank);
});
// ================= KACA =================
//Glass Door
loader.load('/glass_door.glb', (gltf) => {
    const glassDoor = gltf.scene;
    glassDoor.position.set(0.46, 0.18, 0.84);
    glassDoor.scale.set(0.0000007, 0.00047, 0.0475); 
    glassDoor.traverse((child) => {
        if (child.isMesh) {
            // 1. Izinkan transparansi
            child.material.transparent = true;

            // 2. Atur tingkat keburaman (0.0 = hilang total, 1.0 = padat)
            // Coba angka 0.3 atau 0.5 untuk efek kaca
            child.material.opacity = 0.2; 

            // 3. (Opsional) Agar kaca terlihat mengkilap/licin
            child.material.roughness = 0.1; // Makin kecil makin licin
            child.material.metalness = 0.1; // Sedikit pantulan

            // 4. (Opsional) Agar terlihat dari kedua sisi (depan & belakang)
            child.material.side = THREE.DoubleSide; 
            
            // 5. (Penting untuk kaca) Matikan depthWrite jika ada glitch visual tumpang tindih
            // child.material.depthWrite = false; 
        }
    });
    scene.add(glassDoor);
});

// ================= INPUT SYSTEM =================
const keyState = {};
document.addEventListener('keydown', (e) => {
    keyState[e.code] = true;

    // TAMBAHAN: Tekan 'F' untuk menjatuhkan papan
    if (e.code === 'KeyF') {
        isPlankDrop = true;
        isPadlockFalling = true;
    }
});
document.addEventListener('keyup', (e) => keyState[e.code] = false);


function handleMovement() {
    if (controls.isLocked) {
        if (keyState['KeyW']) controls.moveForward(PLAYER_SPEED);
        if (keyState['KeyS']) controls.moveForward(-PLAYER_SPEED);
        if (keyState['KeyA']) controls.moveRight(-PLAYER_SPEED);
        if (keyState['KeyD']) controls.moveRight(PLAYER_SPEED);
        if (keyState['Space']) camera.position.y += 0.01;
        if (keyState['ShiftLeft']) camera.position.y -= 0.01;
    }

    if (vase) {
        // 1. Gravitasi
        vaseVelocityY = -0.0005; 
        vaseVelocityY -= GRAVITY; 
        vase.position.y += vaseVelocityY;

        // 2. Cek apakah masuk Area 1 (Box Atas/Meja)
        const inArea1 = 
            vase.position.x >= flatBoxBB.min.x && 
            vase.position.x <= flatBoxBB.max.x &&
            vase.position.z >= flatBoxBB.min.z && 
            vase.position.z <= flatBoxBB.max.z;

        // 3. Cek apakah masuk Area 2 (Box Bawah/Lantai)
        const inArea2 = 
            vase.position.x >= flatBox2BB.min.x && 
            vase.position.x <= flatBox2BB.max.x &&
            vase.position.z >= flatBox2BB.min.z && 
            vase.position.z <= flatBox2BB.max.z;

        // --- LOGIKA UTAMA ---

        // A. Cek Finish Line (Lantai / Box 2)
        // Kalau sudah sampai lantai, stop semuanya.
        if (inArea2 && vase.position.y <= SURFACE_2_Y) {
            vase.position.y = SURFACE_2_Y;
            vaseVelocityY = 0;
            if (isTumbling) {
                rollSpeed = 0.0005; // Tenaga awal menggelinding di lantai
                isTumbling = false; // Tetap false seperti permintaanmu
            } // Matikan mode terguling
        }
        
        // B. Cek Pemicu Awal (Meja / Box 1)
        // Kalau kena meja, nyalakan 'isTumbling' tapi JANGAN stop Y-nya.
        else if (inArea1 && vase.position.y <= SURFACE_1_Y) {
            isTumbling = true; // AKTIFKAN MODE TERGULING
        }

        // C. Saat Mode Terguling Aktif (Jatuh di Udara)
        if (isTumbling) {
            // Selama tumbling aktif, dia akan geser kanan & muter
            // meskipun sudah tidak nempel meja lagi (di udara).
            vase.position.x += 0.0005; // Geser Kanan
            vase.rotation.z -= 0.00585;   // Muter
        }

        // D. ANIMASI TAMBAHAN: Menggelinding di Lantai (Setelah isTumbling False)
        if (rollSpeed > 0) {
            vase.position.z -= rollSpeed;      // Tetap maju di sumbu Z
            vase.rotation.x -= rollSpeed * 13; // Tetap muter
            rollSpeed *= 0.997;                // Mengurangi kecepatan perlahan (gesekan)

            if (rollSpeed < 0.0001) rollSpeed = 0; // Berhenti total
        }

        // Reset
        if (vase.position.y < -5) {
            vase.position.set(-2.03, 0.5, -1.75); 
            vase.rotation.set(0, 0, 0); 
            vaseVelocityY = 0;
            isTumbling = false;
            rollSpeed = 0; // Reset status
        }
    }
}

function updateDoor() {
    if (!doorHinge) return;

    const distance = camera.position.distanceTo(doorHinge.position);

    // Jarak 1.5 - 2.0 biasanya pas untuk ukuran pintu
    if (distance < 1.2) {
        isOpen = true;
    } else {
        isOpen = false;
    }

    // Tentukan rotasi buka (misal: tambah 1.5 radian)
    const targetRotation = isOpen ? -(Math.PI + 1.5) : -Math.PI;
    
    // Animasi halus pada engselnya
    doorHinge.rotation.y = THREE.MathUtils.lerp(
        doorHinge.rotation.y, 
        targetRotation, 
        0.05 // Kecepatan (makin kecil makin lambat/halus)
    );
}

function updateDrawers() {
    if (drawerLeft) {
        const distLeft = camera.position.distanceTo(drawerLeft.position);
        const isLeftNear = distLeft < 0.4; // Jarak pemicu lebih kecil supaya lebih spesifik
        const targetZLeft = isLeftNear ? -0.85 : -0.65;
        
        drawerLeft.position.z = THREE.MathUtils.lerp(drawerLeft.position.z, targetZLeft, 0.05);
    }

    // 2. Logika untuk Laci Kanan
    if (drawerRight) {
        const distRight = camera.position.distanceTo(drawerRight.position);
        const isRightNear = distRight < 0.4;
        const targetZRight = isRightNear ? -0.85 : -0.65;
        
        drawerRight.position.z = THREE.MathUtils.lerp(drawerRight.position.z, targetZRight, 0.05);
    }
}

function updateLocker() {
    if (!lockerHinge) return;

    const distance = camera.position.distanceTo(lockerHinge.position);
    const isCloseEnough = distance < 1.0;
    const isInFront = camera.position.z > lockerHinge.position.z - 0.15;
    const isOpen = isCloseEnough && isInFront;

    const targetRotation = isOpen ? 0 : -Math.PI * 0.5;

    lockerHinge.rotation.y = THREE.MathUtils.lerp(
        lockerHinge.rotation.y, 
        targetRotation, 
        0.05
    );
}

// ================= MAIN LOOP =================
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta(); 

    if (mixer) mixer.update(delta);

    const x = camera.position.x.toFixed(2);
    const y = camera.position.y.toFixed(2);
    const z = camera.position.z.toFixed(2);
    infoDiv.innerText = `KOORDINAT PLAYER - X: ${x} | Y: ${y} | Z: ${z}`;

    if (grannyPivot) {
        const distance = grannyPivot.position.distanceTo(camera.position);

        // ===============================================
        // LOGIKA ROTASI SMOOTH (SLERP)
        // ===============================================
        
        const timeElapsed = clock.getElapsedTime();

        // 1. Tentukan target koordinat berdasarkan waktu
        if (timeElapsed < 23) {
            // SEBELUM 22 Detik: Target ke kiri (-1.50)
            targetPos.set(-1.50, grannyPivot.position.y, 0);
        } else {
            // SETELAH 22 Detik: Target ke kanan (0.65, ..., 0.88)
            targetPos.set(0.37, grannyPivot.position.y, 0.73);
        }

        // 2. Gunakan dummy object untuk mengintip rotasi target
        // Pindahkan dummy ke posisi Granny saat ini
        dummyTarget.position.copy(grannyPivot.position);
        // Suruh dummy melihat ke target
        dummyTarget.lookAt(targetPos); 

        // 3. Putar Granny secara perlahan mendekati rotasi si dummy
        // Angka 0.05 adalah kecepatan putar (makin kecil makin lambat/halus)
        grannyPivot.quaternion.slerp(dummyTarget.quaternion, 0.3);

        // ===============================================
    }
    
    updateDoor();
    updateDrawers();
    updateLocker();
    handleMovement();
    updateFallingInteractions();
    updatePlankPhysics();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();