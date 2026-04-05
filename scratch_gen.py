def generate_coords():
    coords = []
    
    # Grid diamond approach
    # Center at x=20, y=5
    # y goes 0 to 10. Max width at y=5 is about 18 tiles. 
    # Tile x offset is 2. So tiles go x=2, 4, 6...
    # For a diamond, at y=5, x ranges from 4 to 36.
    
    # Base layer z=0
    for y in range(11):
        dist_y = abs(y - 5)
        # width narrows by 2 tiles (4 x-units) per dist_y
        min_x = 4 + dist_y * 4
        max_x = 36 - dist_y * 4
        if min_x <= max_x:
            for x in range(min_x, max_x + 1, 2):
                coords.append((x, y, 0))
                
    # Stack layers z=1 to z=5
    for z in range(1, 6):
        for y in range(z, 11 - z):
            dist_y = abs(y - 5)
            # narrower diamond in higher z
            min_x = 4 + (dist_y + z) * 4
            max_x = 36 - (dist_y + z) * 4
            if min_x <= max_x:
                # Add some holes or full layers
                for x in range(min_x, max_x + 1, 2):
                    coords.append((x, y, z))

    # Anchors at bottom left and bottom right
    # (x=0, y=10) and (x=40, y=10)
    for z in range(9):
        coords.append((0, 10, z))
        coords.append((40, 10, z))
        
    return coords

c = generate_coords()
print(f"Total tiles initially: {len(c)}")
target = 336
diff = target - len(c)
print(f"Target is {target}, diff = {diff}")
