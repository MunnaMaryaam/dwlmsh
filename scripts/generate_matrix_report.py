#!/usr/bin/env python3
"""
Dynamic Multi-Branch MIS Matrix Report Generator
Module: generate_matrix_report.py
Description: Generates an enterprise-grade Excel workbook containing a horizontal
             side-by-side branch comparison matrix for diamond jewelry distribution.
"""

from typing import List, Optional
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter


def create_matrix_report(
    output_filepath: str = "Sales_Driven_Distribution_Report.xlsx",
    date_range: str = "01-05-2026 to 19-09-2026",
    branches: Optional[List[str]] = None,
    carat_sizes: Optional[List[str]] = None,
) -> str:
    """
    Builds and styles the multi-branch distribution matrix spreadsheet.
    
    Parameters:
        output_filepath (str): Destination path for the generated .xlsx file.
        date_range (str): Active reporting interval text for Row 2.
        branches (List[str]): List of target retail branches to include in the matrix.
        carat_sizes (List[str]): Particulars row identifiers (carat sizes).
        
    Returns:
        str: The saved file path.
    """
    if branches is None:
        branches = [
            "Bashundhara",
            "Baily-Road",
            "Baitul Mukarram",
            "Bogura",
            "Barishal",
            "Chuadanga",
            "Chittagong - #01",
        ]

    if carat_sizes is None:
        carat_sizes = [
            "0.02", "0.03", "0.04", "0.05", "0.06",
            "0.07", "0.08", "0.09", "0.10", "0.11", "0.12"
        ]

    metrics = ["SOLD QTY", "Current Stock", "Average", "Contribution %", "Move IN/OUT"]

    # Typography & Fills
    font_family = "Calibri"
    title_font = Font(name=font_family, size=11, bold=True, color="000000")
    date_font = Font(name=font_family, size=10, bold=True, color="000000")
    branch_font = Font(name=font_family, size=12, bold=True, color="000000")
    metric_font = Font(name=font_family, size=8.5, bold=True, color="000000")
    summary_hdr_font = Font(name=font_family, size=9.5, bold=True, italic=True, color="000000")
    particular_font = Font(name=font_family, size=11, bold=True, color="000000")
    data_font = Font(name=font_family, size=10, bold=False, color="000000")
    summary_data_font = Font(name=font_family, size=10, bold=True, color="000000")

    title_box_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
    branch_hdr_fill = PatternFill(start_color="D9D9D9", end_color="D9D9D9", fill_type="solid")
    metric_hdr_fill = PatternFill(start_color="E7E6E6", end_color="E7E6E6", fill_type="solid")
    move_hdr_fill = PatternFill(start_color="BFBFBF", end_color="BFBFBF", fill_type="solid")
    summary_hdr_fill = PatternFill(start_color="D9D9D9", end_color="D9D9D9", fill_type="solid")

    thin_black = Side(border_style="thin", color="000000")
    medium_black = Side(border_style="medium", color="000000")
    grid_border = Border(left=thin_black, right=thin_black, top=thin_black, bottom=thin_black)

    center_aligned = Alignment(horizontal="center", vertical="center", wrap_text=True)
    right_aligned = Alignment(horizontal="right", vertical="center")
    left_aligned = Alignment(horizontal="left", vertical="center")

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Distribution Matrix"
    ws.views.sheetView[0].showGridLines = True

    # Row 1-2: Title Box
    ws.merge_cells("A1:B2")
    title_cell = ws.cell(row=1, column=1)
    title_cell.value = "Sales-Driven Distribution:\nDiamond Solitaire Earrings"
    title_cell.font = title_font
    title_cell.fill = title_box_fill
    title_cell.alignment = left_aligned

    for r in range(1, 3):
        for c in range(1, 3):
            cell = ws.cell(row=r, column=c)
            top_s = medium_black if r == 1 else None
            bottom_s = medium_black if r == 2 else None
            left_s = medium_black if c == 1 else None
            right_s = medium_black if c == 2 else None
            cell.border = Border(top=top_s, bottom=bottom_s, left=left_s, right=right_s)
            cell.fill = title_box_fill

    # Row 3: Active Date Range
    date_cell = ws.cell(row=3, column=1)
    date_cell.value = date_range
    date_cell.font = date_font
    date_cell.alignment = left_aligned

    # Column A: Particulars Header
    part_cell_top = ws.cell(row=4, column=1, value="")
    part_cell_top.border = grid_border
    part_cell_top.fill = branch_hdr_fill

    part_cell_bottom = ws.cell(row=5, column=1, value="Particulars Name")
    part_cell_bottom.font = Font(name=font_family, size=10, bold=True)
    part_cell_bottom.alignment = center_aligned
    part_cell_bottom.border = grid_border
    part_cell_bottom.fill = branch_hdr_fill

    dwl_col = 2
    branch_stock_cols: List[int] = []
    branch_sold_cols: List[int] = []

    # Column B: DWL Central Warehouse
    ws.cell(row=4, column=dwl_col, value="DWL").font = branch_font
    ws.cell(row=4, column=dwl_col).alignment = center_aligned
    ws.cell(row=4, column=dwl_col).fill = branch_hdr_fill
    ws.cell(row=4, column=dwl_col).border = grid_border

    ws.cell(row=5, column=dwl_col, value="Stock").font = metric_font
    ws.cell(row=5, column=dwl_col).alignment = center_aligned
    ws.cell(row=5, column=dwl_col).fill = metric_hdr_fill
    ws.cell(row=5, column=dwl_col).border = grid_border

    current_col = 3

    # Retail Branches
    for branch_name in branches:
        start_col = current_col
        end_col = current_col + 4

        ws.merge_cells(start_row=4, start_column=start_col, end_row=4, end_column=end_col)
        b_cell = ws.cell(row=4, column=start_col, value=branch_name)
        b_cell.font = branch_font
        b_cell.alignment = center_aligned

        for c in range(start_col, end_col + 1):
            cell = ws.cell(row=4, column=c)
            cell.fill = branch_hdr_fill
            cell.border = grid_border

        for idx, metric_name in enumerate(metrics):
            m_col = start_col + idx
            m_cell = ws.cell(row=5, column=m_col, value=metric_name)
            m_cell.font = metric_font
            m_cell.alignment = center_aligned
            m_cell.border = grid_border
            m_cell.fill = move_hdr_fill if "Move" in metric_name else metric_hdr_fill

            if metric_name == "Current Stock":
                branch_stock_cols.append(m_col)
            elif metric_name == "SOLD QTY":
                branch_sold_cols.append(m_col)

        current_col += 5

    # Right End Summary Columns
    total_stock_col = current_col
    total_sold_col = current_col + 1
    refill_demand_col = current_col + 2

    ws.cell(row=4, column=total_stock_col, value="Total Stock").font = summary_hdr_font
    ws.cell(row=4, column=total_stock_col).alignment = center_aligned
    ws.cell(row=4, column=total_stock_col).fill = summary_hdr_fill
    ws.cell(row=4, column=total_stock_col).border = grid_border
    ws.cell(row=5, column=total_stock_col).border = grid_border
    ws.cell(row=5, column=total_stock_col).fill = summary_hdr_fill

    ws.cell(row=4, column=total_sold_col, value="Total Sold").font = summary_hdr_font
    ws.cell(row=4, column=total_sold_col).alignment = center_aligned
    ws.cell(row=4, column=total_sold_col).fill = summary_hdr_fill
    ws.cell(row=4, column=total_sold_col).border = grid_border
    ws.cell(row=5, column=total_sold_col).border = grid_border
    ws.cell(row=5, column=total_sold_col).fill = summary_hdr_fill

    refill_hdr_fill = PatternFill(start_color="FCE5CD", end_color="FCE5CD", fill_type="solid")
    ws.cell(row=4, column=refill_demand_col, value="Refill Demand").font = summary_hdr_font
    ws.cell(row=4, column=refill_demand_col).alignment = center_aligned
    ws.cell(row=4, column=refill_demand_col).fill = refill_hdr_fill
    ws.cell(row=4, column=refill_demand_col).border = grid_border
    ws.cell(row=5, column=refill_demand_col).border = grid_border
    ws.cell(row=5, column=refill_demand_col).fill = refill_hdr_fill

    # Populate Data
    start_data_row = 6
    for i, carat in enumerate(carat_sizes):
        row_num = start_data_row + i

        part_cell = ws.cell(row=row_num, column=1, value=str(carat))
        part_cell.font = particular_font
        part_cell.alignment = center_aligned
        part_cell.border = grid_border

        dwl_stock_cell = ws.cell(row=row_num, column=dwl_col, value=0)
        dwl_stock_cell.font = data_font
        dwl_stock_cell.alignment = right_aligned
        dwl_stock_cell.border = grid_border
        dwl_stock_cell.number_format = "#,##0"

        col_cursor = 3
        for _ in branches:
            # 1. SOLD QTY
            c_sold = ws.cell(row=row_num, column=col_cursor, value=0)
            c_sold.font = data_font
            c_sold.alignment = right_aligned
            c_sold.border = grid_border
            c_sold.number_format = "#,##0"

            # 2. Current Stock
            c_stock = ws.cell(row=row_num, column=col_cursor + 1, value=0)
            c_stock.font = data_font
            c_stock.alignment = right_aligned
            c_stock.border = grid_border
            c_stock.number_format = "#,##0"

            # 3. Average
            c_avg = ws.cell(row=row_num, column=col_cursor + 2, value=0)
            c_avg.font = data_font
            c_avg.alignment = right_aligned
            c_avg.border = grid_border
            c_avg.number_format = "#,##0"

            # 4. Contribution %
            c_contrib = ws.cell(row=row_num, column=col_cursor + 3, value=0.0)
            c_contrib.font = data_font
            c_contrib.alignment = right_aligned
            c_contrib.border = grid_border
            c_contrib.number_format = "0%"

            # 5. Move IN/OUT
            c_move = ws.cell(row=row_num, column=col_cursor + 4, value=0)
            c_move.font = data_font
            c_move.alignment = right_aligned
            c_move.border = grid_border
            c_move.number_format = "#,##0"

            col_cursor += 5

        # Dynamic Formula for Total Stock: DWL Stock + All Branch Stocks
        all_stock_refs = [f"{get_column_letter(dwl_col)}{row_num}"] + [
            f"{get_column_letter(c)}{row_num}" for c in branch_stock_cols
        ]
        tot_stock_cell = ws.cell(row=row_num, column=total_stock_col, value=f"=SUM({','.join(all_stock_refs)})")
        tot_stock_cell.font = summary_data_font
        tot_stock_cell.alignment = right_aligned
        tot_stock_cell.border = grid_border
        tot_stock_cell.number_format = "#,##0"

        # Dynamic Formula for Total Sold: All Branch Sold Quantities
        all_sold_refs = [f"{get_column_letter(c)}{row_num}" for c in branch_sold_cols]
        tot_sold_cell = ws.cell(row=row_num, column=total_sold_col, value=f"=SUM({','.join(all_sold_refs)})")
        tot_sold_cell.font = summary_data_font
        tot_sold_cell.alignment = right_aligned
        tot_sold_cell.border = grid_border
        tot_sold_cell.number_format = "#,##0"

        # Dynamic Formula for Refill Demand: MAX(0, Total Sold - Total Stock)
        tot_refill_cell = ws.cell(
            row=row_num,
            column=refill_demand_col,
            value=f"=MAX(0, {get_column_letter(total_sold_col)}{row_num}-{get_column_letter(total_stock_col)}{row_num})"
        )
        tot_refill_cell.font = summary_data_font
        tot_refill_cell.alignment = right_aligned
        tot_refill_cell.border = grid_border
        tot_refill_cell.number_format = "#,##0"

    # Row Heights and Column Widths
    ws.row_dimensions[1].height = 18
    ws.row_dimensions[2].height = 18
    ws.row_dimensions[3].height = 20
    ws.row_dimensions[4].height = 28
    ws.row_dimensions[5].height = 24

    for r in range(start_data_row, start_data_row + len(carat_sizes)):
        ws.row_dimensions[r].height = 20

    ws.column_dimensions["A"].width = 18
    ws.column_dimensions[get_column_letter(dwl_col)].width = 9

    for col_idx in range(3, refill_demand_col + 1):
        col_letter = get_column_letter(col_idx)
        if col_idx in [total_stock_col, total_sold_col, refill_demand_col]:
            ws.column_dimensions[col_letter].width = 12
        else:
            ws.column_dimensions[col_letter].width = 10

    wb.save(output_filepath)
    return output_filepath


if __name__ == "__main__":
    generated_file = create_matrix_report("Sales_Driven_Distribution_Report.xlsx")
    print(f"Matrix report successfully created: {generated_file}")
