import os
import sys
import asyncio
import subprocess
import json
import imageio_ffmpeg

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
VOICE = "en-IN-PrabhatNeural"
ASSETS_DIR = "video_assets"
BUILD_DIR = "video_build"
OUTPUT_FILE = "StayHaven_Assignment_Presentation.mp4"

SCENES = [
    {
        "id": "scene1",
        "image": os.path.join(ASSETS_DIR, "scene1_login.png"),
        "text": "Hello. In this video, I am presenting StayHaven, an enterprise-grade PG and hostel management platform built to streamline room operations, tenant billing, and maintenance tracking. The system features a modern React TypeScript frontend styled with Tailwind CSS, an Express backend, and MongoDB Atlas for data persistence. Let's begin by signing into our property manager portal."
    },
    {
        "id": "scene2",
        "image": os.path.join(ASSETS_DIR, "scene2_dashboard.png"),
        "text": "Upon logging in, property managers see the operations dashboard with real-time occupancy rates—currently three out of six beds occupied—along with monthly collections versus total billed amounts. The dashboard instantly surfaces overdue accounts and pending maintenance requests, enabling proactive property administration."
    },
    {
        "id": "scene3",
        "image": os.path.join(ASSETS_DIR, "scene3_rooms.png"),
        "text": "Navigating to Rooms and Beds, we manage our complete property inventory. Each room displays its configuration, floor level, monthly rent, and individual bed allocations. Notice how each bed clearly displays occupied or vacant status, alongside the resident assigned. This provides the foundation for our single-occupancy enforcement."
    },
    {
        "id": "scene4",
        "image": os.path.join(ASSETS_DIR, "scene4_checkin_modal.png"),
        "text": "When assigning a resident to a bed, the system performs automated financial computations. Selecting a tenant, bed, and move-in date triggers a live preview of the pro-rated first month's rent and required security deposit. A bed can never have two active occupants at the same time, enforced strictly on our server."
    },
    {
        "id": "scene5",
        "image": os.path.join(ASSETS_DIR, "scene5_billing.png"),
        "text": "In the Billing and Invoicing ledger, StayHaven tracks monthly rent cycles across residents. Each invoice shows billing periods, base rent, outstanding balance, and status—Due, Partially Paid, Overdue, or Settled. Managers can trigger automated batch billing or record tenant payments with customizable split amounts."
    },
    {
        "id": "scene6",
        "image": os.path.join(ASSETS_DIR, "scene6_receipt.png"),
        "text": "For financial transparency, whenever a payment is recorded, StayHaven automatically generates a printable and downloadable payment receipt. It includes an auto-generated unique receipt number, tenant credentials, bed assignment, payment method, and a detailed breakdown of the amount paid against the remaining balance."
    },
    {
        "id": "scene7",
        "image": os.path.join(ASSETS_DIR, "scene7_work_orders.png"),
        "text": "For facility upkeep, our Maintenance Work Orders system allows property managers to track resident complaints from submission to resolution. Requests are categorized by domain—such as Electrical, Plumbing, or WiFi—and flagged by severity. Managers can update complaint status in real-time and log resolution notes with timestamps."
    },
    {
        "id": "scene8",
        "image": os.path.join(ASSETS_DIR, "scene8_resident_portal.png"),
        "text": "StayHaven also delivers a dedicated Resident Portal. When a tenant logs into their account, they can view their assigned room and bed number, monthly rent rate, total outstanding balance, and full invoice payment history. Furthermore, residents can raise maintenance complaints directly from their dashboard."
    },
    {
        "id": "scene9",
        "image": os.path.join(ASSETS_DIR, "scene9_code_prorated.png"),
        "text": "Now, let's explore a core engineering challenge solved in this project: calculating exact pro-rated rent for mid-month check-ins and check-outs. In our rentCalculator module, we dynamically determine the exact calendar days in any month, accounting for leap years. We calculate active days inclusively, compute the exact daily rate, and round to the nearest rupee. This algorithm guarantees that whether a tenant moves in on the 10th or 15th, they are billed precisely for the days occupied."
    },
    {
        "id": "scene10",
        "image": os.path.join(ASSETS_DIR, "scene10_code_double_booking.png"),
        "text": "Another critical requirement was preventing bed double-booking. In our rooms API route, before any bed assignment is saved, the server queries MongoDB for any active overlapping occupancy on the target bed. If an active tenant exists without a check-out date, the server rejects the request with an HTTP 409 Conflict error. We backed all core business logic with a comprehensive Vitest automated test suite covering 18 test cases, including leap year pro-rating, partial payments, and concurrency safety. Thank you for watching."
    }
]

async def generateAudio(text, outPath):
    import_edge_tts = __import__('edge_tts')
    communicate = import_edge_tts.Communicate(text, VOICE, rate="+15%")
    await communicate.save(outPath)

def get_audio_duration(audio_path):
    cmd = [
        FFMPEG_EXE, "-i", audio_path
    ]
    res = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    for line in res.stderr.splitlines():
        if "Duration:" in line:
            # Duration: 00:00:18.45, start: ...
            parts = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = parts.split(":")
            return float(h)*3600 + float(m)*60 + float(s)
    return 15.0

async def main():
    os.makedirs(BUILD_DIR, exist_ok=True)
    print("Step 1: Generating audio narrations using Edge TTS...")
    
    clip_files = []
    total_duration = 0.0

    for idx, scene in enumerate(SCENES, 1):
        audio_file = os.path.join(BUILD_DIR, f"{scene['id']}.mp3")
        clip_file = os.path.join(BUILD_DIR, f"{scene['id']}.mp4")
        
        print(f"Generating narration for Scene {idx}/{len(SCENES)}: {scene['id']}...")
        await generateAudio(scene["text"], audio_file)
        
        duration = get_audio_duration(audio_file)
        # Add 0.5s padding so the scene doesn't cut abruptly
        padded_duration = duration + 0.6
        total_duration += padded_duration
        print(f"  Duration: {duration:.2f}s (Padded to {padded_duration:.2f}s)")
        
        # Render video clip for this scene
        # 1920x1080 30fps H.264 + AAC
        cmd = [
            FFMPEG_EXE, "-y",
            "-loop", "1",
            "-i", scene["image"],
            "-i", audio_file,
            "-c:v", "libx264",
            "-tune", "stillimage",
            "-c:a", "aac",
            "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-t", str(padded_duration),
            "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
            "-r", "30",
            clip_file
        ]
        
        print(f"  Rendering video segment {clip_file}...")
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
        clip_files.append(clip_file)

    print(f"\nTotal video duration: {total_duration/60:.2f} minutes ({total_duration:.1f} seconds)")

    print("\nStep 2: Concatenating all scenes into final video...")
    concat_list = os.path.join(BUILD_DIR, "concat_list.txt")
    with open(concat_list, "w") as f:
        for cf in clip_files:
            abs_path = os.path.abspath(cf).replace("\\", "/")
            f.write(f"file '{abs_path}'\n")

    concat_cmd = [
        FFMPEG_EXE, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_list,
        "-c", "copy",
        OUTPUT_FILE
    ]
    subprocess.run(concat_cmd, check=True)
    
    file_size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    print(f"\nSUCCESS! Video compiled successfully:")
    print(f"File: {os.path.abspath(OUTPUT_FILE)}")
    print(f"Size: {file_size_mb:.2f} MB")
    print(f"Duration: {total_duration/60:.2f} minutes ({total_duration:.1f} seconds)")

if __name__ == "__main__":
    asyncio.run(main())
