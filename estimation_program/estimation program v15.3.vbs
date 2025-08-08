#Forms

##ReferralSection

Private Sub UserForm_Activate()
    Dim xPos As Long, yPos As Long

    ' Center on Excel window
    With Application
        xPos = .Left + (.Width / 2) - (Me.Width / 2)
        yPos = .Top + (.Height / 2) - (Me.Height / 2)
    End With

    Me.StartUpPosition = 0
    Me.Left = xPos
    Me.Top = yPos
End Sub


Private Sub UserForm_Initialize()
    Dim cell As Range
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("Coding") 'Corrected to "Coding"

    ComboBox1.Clear
    For Each cell In ws.Range("AA26:AA43")
        If Trim(cell.Value) <> "" Then
            ComboBox1.AddItem cell.Value
        End If
    Next cell
End Sub

Private Sub CommandButton1_Click()
    If ComboBox1.ListIndex <> -1 Then
        ThisWorkbook.Sheets("Home").Range("F7").Value = ComboBox1.Value
    End If
    Unload Me
End Sub




#Modules

##1

Sub PrintSiteWorks()
    Application.Dialogs(xlDialogPrinterSetup).Show
    Sheets("ConstructionSheet").PrintOut From:=1, to:=2, Copies:=1, Collate _
        :=True, IgnorePrintAreas:=False


End Sub

Sub SpaghettiCode()
    Application.Dialogs(xlDialogPrinterSetup).Show
    Sheets("Coding").PrintOut From:=1, to:=10, Copies:=1, Collate _
        :=True, IgnorePrintAreas:=False


End Sub

Sub PrintCurrent()
    Application.Dialogs(xlDialogPrinterSetup).Show
    ActiveSheet.PrintOut From:=1, to:=2, Copies:=1, Collate _
        :=True, IgnorePrintAreas:=False


End Sub

Sub CheckAndPrintSiteWorks()
    If Range = J32 = "FALSE" Then Exit Sub
    Application.Dialogs(xlDialogPrinterSetup).Show
    Sheets("ConstructionSheet").PrintOut From:=1, to:=2, Copies:=1, Collate _
        :=True, IgnorePrintAreas:=False


End Sub
Sub CreateInvoiceAndExportPDF()
    Dim fso As Object
    Dim folderPath As String
    Dim altFolderPath As String
    Dim folder As Object
    Dim file As Object
    Dim highestNum As Long
    Dim invoiceNum As String
    Dim fileName As String
    Dim namePart As String, typePart As String
    Dim fullPath As String
    Dim ws As Worksheet
    Dim baseYear As String

    Set fso = CreateObject("Scripting.FileSystemObject")
    Set ws = ThisWorkbook.ActiveSheet
    
    ' Folder options
    folderPath = "C:\Users\User\Dropbox\Permits\Invoices\Invoices 25 - 26"
    altFolderPath = "C:\Users\Owner\Dropbox\Permits\Invoices\Invoices 25 - 26"

    ' Try primary folder
    If fso.FolderExists(folderPath) Then
        Set folder = fso.GetFolder(folderPath)
    ElseIf fso.FolderExists(altFolderPath) Then
        Set folder = fso.GetFolder(altFolderPath)
    Else
        MsgBox "Neither folder exists. Please check the paths.", vbExclamation
        Exit Sub
    End If

    ' Get current year prefix
    baseYear = Year(Date)

    ' Find the highest invoice number from filenames
    highestNum = 0
    For Each file In folder.Files
        If LCase(fso.GetExtensionName(file.Name)) = "pdf" Then
            If Left(file.Name, 4) = baseYear Then
                Dim numPart As String
                numPart = Mid(file.Name, 5, 3)
                If IsNumeric(numPart) Then
                    If CLng(numPart) > highestNum Then
                        highestNum = CLng(numPart)
                    End If
                End If
            End If
        End If
    Next file

    ' Increment for new invoice number
    invoiceNum = baseYear & Format(highestNum + 1, "000")
    ws.Range("I9").Value = invoiceNum

    ' Get name and type
    namePart = Trim(ws.Range("G11").Value)
    typePart = Trim(ws.Range("B20").Value)

    ' Construct filename
    fileName = invoiceNum & " - " & namePart & " - " & typePart & ".pdf"
    fullPath = folder.Path & "\" & fileName

    ' Export current sheet as PDF
    ws.ExportAsFixedFormat Type:=xlTypePDF, _
        fileName:=fullPath, _
        Quality:=xlQualityStandard, _
        IncludeDocProperties:=True, _
        IgnorePrintAreas:=False, _
        OpenAfterPublish:=True

    MsgBox "Invoice saved as: " & vbCrLf & fullPath, vbInformation
End Sub


##10



Sub CreateFolderStructure()
    Dim objRow As Range, objCell As Range, strFolders As String
    myFile = Sheets("Home").Range("M14").Text

    For Each objRow In ActiveSheet.UsedRange.Rows
        strFolders = "U:\3 - MASTER - JOB LISTS\A1 - JOBS SETUP - HTA & JOBS AWAITING DEPOSIT\" & myFile
        For Each objCell In objRow.Cells
            strFolders = strFolders & "\" & objCell
        Next
        Shell ("cmd /c md " & Chr(34) & strFolders & Chr(34))
    Next
End Sub



##11

Sub SendToBryan2()

    Dim sEmail_Recipients As String
        
    sEmail_Recipients = InputBox("welximak@hotmail.com")
    
    ThisWorkbook.Worksheets("ConstructionEmail").Copy
    
    With ActiveWorkbook
        .SendMail Recipients:=sEmail_Recipients, Subject:="Construction Fee Proposal" + Range("B6").Value + " " + Range("H6").Value
        
        .Close savechanges:=False
        
         
    End With

    
End Sub


##12

Sub fill1()

Range("I9").Value = Range("I9").Value + 1

Range("G11").Value = _
    InputBox(Prompt:="Name")
    
    
Range("G12").Value = _
    InputBox(Prompt:="Street Number, Street Name")
    
Range("G13").Value = _
    InputBox(Prompt:="Town, State, Postcode")

Range("B20").Value = _
    InputBox(Prompt:="Item Description")
    
    
Range("H20").Value = _
    InputBox(Prompt:="Unit Price")
    

End Sub

Sub fill2()

    Range("A21").Select
    ActiveCell.FormulaR1C1 = "1"
    Range("A1").Select

Range("B21").Value = _
    InputBox(Prompt:="Item Description")
    
    
Range("H21").Value = _
    InputBox(Prompt:="Unit Price")
    

End Sub

Sub fill3()

    Range("A22").Select
    ActiveCell.FormulaR1C1 = "1"
    Range("A1").Select

Range("B22").Value = _
    InputBox(Prompt:="Item Description")
    
    
Range("H22").Value = _
    InputBox(Prompt:="Unit Price")
    

End Sub

Sub fill4()

    Range("A23").Select
    ActiveCell.FormulaR1C1 = "1"
    Range("A1").Select

Range("B23").Value = _
    InputBox(Prompt:="Item Description")
    
    
Range("H23").Value = _
    InputBox(Prompt:="Unit Price")
    

End Sub

Sub Clear()
'
' Clear Macro
'

'
    Range("G11:I13").Select
    Selection.ClearContents
    Range("A21").Select
    Selection.ClearContents
    Range("B20:C21").Select
    Selection.ClearContents
    Range("H20:I21").Select
    Selection.ClearContents
    Range("A1").Select
End Sub

Sub Up()

Range("I9").Value = Range("I9").Value + 1
End Sub

Sub Down()

Range("I9").Value = Range("I9").Value - 1
End Sub


##13

Sub PrintKitConstPermit()

'       ActiveWindow.SmallScroll Down:=38
    Rows("54:120").Select
    Selection.EntireRow.Hidden = False
    ActiveWindow.SmallScroll Down:=-38
    Range("A1").Select
    Range("A1:I201").Select
    ActiveWindow.SmallScroll Down:=-168
    ActiveSheet.PageSetup.PrintArea = "$A$1:$g$224"
    Range("A1").Select
    
    Application.Dialogs(xlDialogPrinterSetup).Show
    ActiveWindow.SelectedSheets.PrintOut Copies:=1, Collate:=True, _
        IgnorePrintAreas:=False
        
    ActiveWindow.SmallScroll Down:=49
    Rows("55:119").Select
    Selection.EntireRow.Hidden = True
    ActiveWindow.SmallScroll Down:=-34
    Range("A1").Select
End Sub
Sub PrintKitConst()
'
' PrintKitConst Macro
'

'   Rows("54:120").Select
    Selection.EntireRow.Hidden = False
    ActiveWindow.SmallScroll Down:=-38
    Range("A1").Select
    
    Range("A1:I50").Select
    ActiveWindow.SmallScroll Down:=111
    Range("A1:I151").Select
    ActiveSheet.PageSetup.PrintArea = "$A$1:$G$171"
    Range("A1").Select
    
    Application.Dialogs(xlDialogPrinterSetup).Show
    ActiveWindow.SelectedSheets.PrintOut Copies:=1, Collate:=True, _
        IgnorePrintAreas:=False
        
    ActiveWindow.SmallScroll Down:=49
    Rows("55:119").Select
    Selection.EntireRow.Hidden = True
    ActiveWindow.SmallScroll Down:=-34
    Range("A1").Select
End Sub


##15

Sub PrintKitPermit()
'
' PrintKitPermit Macro
'
    Rows("54:120").Select
    Selection.EntireRow.Hidden = False
    ActiveWindow.SmallScroll Down:=-38
    Range("A1").Select
'
    Range("A1").Select
    ActiveWindow.SmallScroll Down:=106
    Range("A1:G119").Select
    ActiveWindow.SmallScroll Down:=54
    Range("A1:G119,A172").Select
    Range("A172").Activate
    ActiveWindow.SmallScroll Down:=49
    Range("A1:G119,A172:G224").Select
    Range("A172").Activate
    ActiveSheet.PageSetup.PrintArea = "$A$1:$G$119,$A$172:$G$224"
    
    Range("A1").Select
     Application.Dialogs(xlDialogPrinterSetup).Show
    ActiveWindow.SelectedSheets.PrintOut Copies:=1, Collate:=True, _
        IgnorePrintAreas:=False
        
    ActiveWindow.SmallScroll Down:=49
    Rows("55:119").Select
    Selection.EntireRow.Hidden = True
    ActiveWindow.SmallScroll Down:=-34
    Range("A1").Select
        
End Sub


##16

Sub PRINTConstOnly()


    Dim fso As Object
    Dim folder As Object
    Dim basePath As String
    Dim altBasePath As String
    Dim selectedBasePath As String
    Dim searchFolder As String
    Dim subfolderName As String
    Dim subfolderPath As String
    Dim saveFileName As String
    Dim basePdfName As String
    Dim pdfFileName As String
    Dim version As Integer
    Dim foundMatch As Boolean
    Dim homeSheet As Worksheet
    Dim quotingSheet As Worksheet

    ' Reference sheets
    Set homeSheet = Sheets("Home")
    Set quotingSheet = Sheets("BBB Estimate")
    Set fso = CreateObject("Scripting.FileSystemObject")

    ' Get inputs
    searchFolder = Trim(homeSheet.Range("F7").Value)
    subfolderName = Trim(homeSheet.Range("F8").Value)

    ' Input validation
    If LCase(searchFolder) = "select referral" Or searchFolder = "" Or subfolderName = "" Then
        MsgBox "Referral and job folder name (Home!F7 and F8) must be set to proceed.", vbExclamation
        Exit Sub
    End If

    ' Determine base paths
    If searchFolder = "Referred by James (Eureka Bendigo)" Then
        basePath = "C:\Users\Owner\Dropbox\Permits\01-Eureka Permits\1. Quotes\"
        altBasePath = "C:\Users\User\Dropbox\Permits\01-Eureka Permits\1. Quotes\"
    Else
        basePath = "C:\Users\Owner\Dropbox\Permits\02-General Permits\1 - Quotes 2025\"
        altBasePath = "C:\Users\User\Dropbox\Permits\02-General Permits\1 - Quotes 2025\"
    End If

    ' Resolve which base path exists
    If fso.FolderExists(basePath) Then
        selectedBasePath = basePath
    ElseIf fso.FolderExists(altBasePath) Then
        selectedBasePath = altBasePath
    Else
        MsgBox "Neither base path could be found." & vbCrLf & "Please check the Dropbox folder path.", vbCritical
        Exit Sub
    End If

    ' Locate matching folder
    foundMatch = False
    For Each folder In fso.GetFolder(selectedBasePath).SubFolders
        If StrComp(folder.Name, searchFolder, vbTextCompare) = 0 Then
            foundMatch = True
            subfolderPath = folder.Path & "\" & subfolderName

            ' Create subfolder if needed
            If Not fso.FolderExists(subfolderPath) Then
                fso.CreateFolder subfolderPath
            End If

            ' Save .xlsm workbook (always overwrite)
            saveFileName = subfolderPath & "\" & subfolderName & ".xlsm"
            ThisWorkbook.SaveCopyAs saveFileName

' Prepare base PDF name
basePdfName = subfolderPath & "\Construction Estimate"
pdfFileName = basePdfName & ".pdf"
version = 1

' Check if PDF already exists; if so, append version #
Do While fso.FileExists(pdfFileName)
    pdfFileName = basePdfName & " version " & version & ".pdf"
    version = version + 1
Loop


            ' Export "BBB Estimate" sheet as PDF
            quotingSheet.ExportAsFixedFormat _
                Type:=xlTypePDF, _
                fileName:=pdfFileName, _
                Quality:=xlQualityStandard, _
                IncludeDocProperties:=True, _
                IgnorePrintAreas:=False, _
                OpenAfterPublish:=False

            MsgBox "Workbook saved to:" & vbCrLf & saveFileName & vbCrLf & "PDF saved to:" & vbCrLf & pdfFileName, vbInformation
            Exit For
        End If
    Next folder

    If Not foundMatch Then
        MsgBox "Referral folder '" & searchFolder & "' was not found in:" & vbCrLf & selectedBasePath, vbExclamation
    End If
 
End Sub
Sub PRINTPermitOnly()
'
' PRINTPermitOnly Macro
'

'
    ActiveWindow.SmallScroll Down:=165
    Range("A172:G224").Select
    ActiveSheet.PageSetup.PrintArea = "$A$172:$G$224"
    ActiveWindow.SmallScroll Down:=-150
    Range("A1").Select
    
    Application.Dialogs(xlDialogPrinterSetup).Show
    ActiveWindow.SelectedSheets.PrintOut Copies:=1, Collate:=True, _
        IgnorePrintAreas:=False
End Sub


##17

Sub HideUnhide()
'
' HideUnhide Macro
'

'
    ActiveWindow.SmallScroll Down:=49
    Rows("55:119").Select
    Selection.EntireRow.Hidden = True
    ActiveWindow.SmallScroll Down:=-34
    Range("A1").Select
    ActiveWindow.SmallScroll Down:=38
    Rows("54:120").Select
    Selection.EntireRow.Hidden = False
    ActiveWindow.SmallScroll Down:=-38
    Range("A1").Select
End Sub


##18

Sub SETABCOnly()
'
' ABCOnly Macro
'

'
    Range("A1:J100").Select
    ActiveWindow.SmallScroll Down:=38
    Range("A1:J100,A151:J250").Select
    Range("A151").Activate
    ActiveSheet.PageSetup.PrintArea = "$A$1:$J$100,$A$151:$J$250"
    ActiveWindow.SmallScroll Down:=-132
    Range("A1").Select
End Sub
Sub SetMultipleSurveyor()
'
' SetMultipleSurveyor Macro
'

'
    Range("A1:J250").Select
    ActiveSheet.PageSetup.PrintArea = "$A$1:$J$250"
    Range("A1").Select
End Sub


##2

Sub BackConsatruction()
    Sheets("Construction").Select
End Sub
Sub Construction()

    Dim fso As Object
    Dim folder As Object
    Dim basePath As String
    Dim altBasePath As String
    Dim selectedBasePath As String
    Dim searchFolder As String
    Dim subfolderName As String
    Dim subfolderPath As String
    Dim foundMatch As Boolean
    Dim kitPriceInput As Variant

    ' Get values from cells
    searchFolder = Range("F7").Value
    subfolderName = Range("F8").Value

    ' If referral not selected, show the userform
    If LCase(Trim(searchFolder)) = "select referral" Then
        ReferralSelection.Show
        searchFolder = Range("F7").Value ' Update after selection
    End If

    ' Exit early if Test is selected (no folder creation)
    If LCase(Trim(searchFolder)) = "test" Then
        Sheets("Construction").Select
        Exit Sub
    End If

    ' Prompt for Kit Price if M15 is invalid
    If Not IsNumeric(Range("M15").Value) Or Range("M15").Value <= 0 Then
        Do
            kitPriceInput = InputBox("Please enter the kit price before continuing:", "Kit Price Required")
            If kitPriceInput = vbNullString Then
                MsgBox "Kit price is required to continue.", vbExclamation, "Cancelled"
                Exit Sub
            End If
        Loop While Not IsNumeric(kitPriceInput) Or Val(kitPriceInput) <= 0
        Range("M15").Value = Val(kitPriceInput)
    End If

    Set fso = CreateObject("Scripting.FileSystemObject")

    ' Determine path based on referral type
    If searchFolder = "Referred by James (Eureka Bendigo)" Then
        basePath = "C:\Users\Owner\Dropbox\Permits\01-Eureka Permits\1. Quotes\"
        altBasePath = "C:\Users\User\Dropbox\Permits\01-Eureka Permits\1. Quotes\"
    Else
        basePath = "C:\Users\Owner\Dropbox\Permits\02-General Permits\1 - Quotes 2025\"
        altBasePath = "C:\Users\User\Dropbox\Permits\02-General Permits\1 - Quotes 2025\"
    End If

    ' Determine if either base path exists
    If fso.FolderExists(basePath) Then
        selectedBasePath = basePath
    ElseIf fso.FolderExists(altBasePath) Then
        selectedBasePath = altBasePath
    Else
        MsgBox "Neither base path could be found." & vbCrLf & "Please check the Dropbox folder path.", vbCritical
        Sheets("Construction").Select
        Exit Sub
    End If

    ' Search for matching folder
    foundMatch = False
    For Each folder In fso.GetFolder(selectedBasePath).SubFolders
        If StrComp(folder.Name, searchFolder, vbTextCompare) = 0 Then
            foundMatch = True
            subfolderPath = folder.Path & "\" & subfolderName

            If fso.FolderExists(subfolderPath) Then
                MsgBox "Folder '" & subfolderName & "' already exists in '" & folder.Name & "'.", vbInformation
            Else
                fso.CreateFolder subfolderPath
            End If

            Exit For
        End If
    Next folder

    If Not foundMatch Then
        MsgBox "Folder matching '" & searchFolder & "' not found in: " & selectedBasePath, vbExclamation
    End If

    Sheets("Construction").Select
End Sub




Sub Back()
'
' Back Macro
'

'
    Sheets("Home").Select
End Sub
Sub Permit()
'
' Permit Macro
'

'
    Sheets("Permits").Select
End Sub

Sub PrintPermit2()
'
' PrintPermit2 Macro
'

Application.Dialogs(xlDialogPrinterSetup).Show
    ActiveWindow.SelectedSheets.PrintOut Copies:=1, Collate:=True, _
        IgnorePrintAreas:=False
        
            Dim shname As String
    
    Set emailApplication = CreateObject("Outlook.Application")
    Set emailItem = emailApplication.CreateItem(0)
    
    emailItem.to = "permits@vicpa.com.au"
    emailItem.Subject = "FORBIDDEN"
    emailItem.Body = "Someone used the forbidden page!"
    
    'emailItem.Attachments.Add ActiveWorkbook.FullName

    emailItem.Send
    'emailItem.Display
    
    
    Set emailItem = Nothing
    Set emailApplication = Nothing
End Sub
Sub Code()
'
' Code Macro
'

'
    Sheets("Coding").Select
End Sub

Sub PrintBestSheds()

    Dim fso As Object
    Dim folder As Object
    Dim basePath As String
    Dim altBasePath As String
    Dim selectedBasePath As String
    Dim searchFolder As String
    Dim subfolderName As String
    Dim subfolderPath As String
    Dim saveFileName As String
    Dim basePdfName As String
    Dim pdfFileName As String
    Dim version As Integer
    Dim foundMatch As Boolean
    Dim homeSheet As Worksheet
    Dim quotingSheet As Worksheet
    Dim questionnaireSheet As Worksheet
    Dim humeCheck As VbMsgBoxResult

    ' Reference sheets
    Set homeSheet = Sheets("Home")
    Set quotingSheet = Sheets("Best Sheds Quoting")
    Set questionnaireSheet = Sheets("Questionnaire")
    Set fso = CreateObject("Scripting.FileSystemObject")

    ' Get inputs
    searchFolder = Trim(homeSheet.Range("F7").Value)
    subfolderName = Trim(homeSheet.Range("F8").Value)

    ' Input validation
    If LCase(searchFolder) = "select referral" Or searchFolder = "" Or subfolderName = "" Then
        MsgBox "Referral and job folder name (Home!F7 and F8) must be set to proceed.", vbExclamation
        Exit Sub
    End If

    ' Check if Hume City Council is selected
    If Trim(questionnaireSheet.Range("D5").Value) = "Hume City Council" Then
        humeCheck = MsgBox("Hume City Council has been selected." & vbCrLf & _
            "Have you checked the council website for added fees?", vbYesNo + vbQuestion, "Check Required")
        If humeCheck = vbNo Then
            Exit Sub
        End If
    End If

    ' Determine base paths
    If searchFolder = "Referred by James (Eureka Bendigo)" Then
        basePath = "C:\Users\Owner\Dropbox\Permits\01-Eureka Permits\1. Quotes\"
        altBasePath = "C:\Users\User\Dropbox\Permits\01-Eureka Permits\1. Quotes\"
    Else
        basePath = "C:\Users\Owner\Dropbox\Permits\02-General Permits\1 - Quotes 2025\"
        altBasePath = "C:\Users\User\Dropbox\Permits\02-General Permits\1 - Quotes 2025\"
    End If

    ' Resolve which base path exists
    If fso.FolderExists(basePath) Then
        selectedBasePath = basePath
    ElseIf fso.FolderExists(altBasePath) Then
        selectedBasePath = altBasePath
    Else
        MsgBox "Neither base path could be found." & vbCrLf & "Please check the Dropbox folder path.", vbCritical
        Exit Sub
    End If

    ' Locate matching folder
    foundMatch = False
    For Each folder In fso.GetFolder(selectedBasePath).SubFolders
        If StrComp(folder.Name, searchFolder, vbTextCompare) = 0 Then
            foundMatch = True
            subfolderPath = folder.Path & "\" & subfolderName

            ' Create subfolder if needed
            If Not fso.FolderExists(subfolderPath) Then
                fso.CreateFolder subfolderPath
            End If

            ' Save .xlsm workbook
            saveFileName = subfolderPath & "\" & subfolderName & ".xlsm"

            If StrComp(ThisWorkbook.FullName, saveFileName, vbTextCompare) = 0 Then
                ThisWorkbook.Save
            Else
                ThisWorkbook.SaveCopyAs saveFileName
            End If

            ' Prepare base PDF name
            basePdfName = subfolderPath & "\Permit Fee Proposal"
            pdfFileName = basePdfName & ".pdf"
            version = 1

            Do While fso.FileExists(pdfFileName)
                pdfFileName = basePdfName & " version " & version & ".pdf"
                version = version + 1
            Loop

            ' Export "Best Sheds Quoting" sheet as PDF
            quotingSheet.ExportAsFixedFormat _
                Type:=xlTypePDF, _
                fileName:=pdfFileName, _
                Quality:=xlQualityStandard, _
                IncludeDocProperties:=True, _
                IgnorePrintAreas:=False, _
                OpenAfterPublish:=False

            MsgBox "Workbook saved to:" & vbCrLf & saveFileName & vbCrLf & _
                   "PDF saved to:" & vbCrLf & pdfFileName, vbInformation
            Shell "explorer.exe """ & subfolderPath & """", vbNormalFocus

            Exit For
        End If
    Next folder

    If Not foundMatch Then
        MsgBox "Referral folder '" & searchFolder & "' was not found in:" & vbCrLf & selectedBasePath, vbExclamation
    End If

End Sub


Sub PrintPermit1()
'
' PrintPermit2 Macro
'

Application.Dialogs(xlDialogPrinterSetup).Show
    ActiveWindow.SelectedSheets.PrintOut Copies:=1, Collate:=True, _
        IgnorePrintAreas:=False
        
            Dim shname As String
    
Range("A1").Select

End Sub
Sub PrintVPAForm()
'
' PrintPermit2 Macro
    Dim mlt As String

    mlt = Application.InputBox("Input 2nd Owner's Name (If none leave blank)")

    ActiveSheet.Range("D28").Value = mlt
    
    If Range("M208") = False Then
mlt = Application.InputBox("Input items to be stored in the shed:")
            ActiveSheet.Range("L208").Value = mlt
End If

Application.Dialogs(xlDialogPrinterSetup).Show
    ActiveWindow.SelectedSheets.PrintOut Copies:=1, Collate:=True, _
        IgnorePrintAreas:=False
        
            Dim shname As String
    
Range("A1").Select

End Sub

Sub OpenOvershadowCalcs()
    Dim fPath1 As String
    Dim fPath2 As String
    Dim fso As Object

    Set fso = CreateObject("Scripting.FileSystemObject")

    fPath1 = "C:\Users\Owner\Dropbox\Permits\Documents\OVERSHADOWING\Overshadow Calcs.xlsx"
    fPath2 = "C:\Users\User\Dropbox\Permits\Documents\OVERSHADOWING\Overshadow Calcs.xlsx"

    If fso.FileExists(fPath1) Then
        Workbooks.Open fPath1
    ElseIf fso.FileExists(fPath2) Then
        Workbooks.Open fPath2
    Else
        MsgBox "File not found in either location.", vbExclamation
    End If
End Sub



##3

Sub Questionnaire()
'
' Questionnaire Macro
'

'
    Sheets("Permit Questionnaire").Select
End Sub


##4

Sub ConstWorksPrint()
'
' ConstWorksPrint Macro
'

'
    ActiveWindow.ConstructionSheet.PrintOut Copies:=1, Collate:=True, _
        IgnorePrintAreas:=False
End Sub
Sub SendToAmandah()

    'Dim emailApplication As Object
    'Dim emailItem As Object
    Dim shname As String
    
    Set emailApplication = CreateObject("Outlook.Application")
    Set emailItem = emailApplication.CreateItem(0)
    
    emailItem.to = "permits@vicpa.com.au"
    emailItem.Subject = "Reporting Error in Estimation program"
    emailItem.Body = InputBox("Describe Error")
    
    'emailItem.Attachments.Add ActiveWorkbook.FullName

    emailItem.Send
    'emailItem.Display
    
    
    Set emailItem = Nothing
    Set emailApplication = Nothing
    
    
End Sub


Sub PrintToBryan()

Dim userPath As String
Dim FileName1 As String
Dim FileName2 As String

userPath = Environ("UserProfile")

'Edit the save location here with first folder location after C:\Users\[user]\ or leave to save to Desktop
Const LOCATION As String = "\Desktop\"

'Select which cells to use in filename here
Application.DisplayAlerts = False
FileName1 = Range("B6")
FileName2 = Range("H6")

With ActiveSheet

'Edit filename format here or keep as default (default text - text.pdf)
PDFFullName = userPath & LOCATION & FileName1 & " CONST " & FileName2 & ".pdf"

ActiveSheet.ExportAsFixedFormat Type:=xlTypePDF, fileName:=PDFFullName, Quality:=xlQualityStandard, OpenAfterPublish:=False
Application.DisplayAlerts = True

End With


End Sub


##5

Sub DropDown23_Change()
Private Sub Worksheet_Change(ByVal Target As Range)
Dim KeyCells As Range

' The variable KeyCells contains the cells that will
' cause an alert when they are changed.
Set KeyCells = Range("R7:R30")

If Not Application.Intersect(KeyCells, Range(Target.Address)) _
       Is Nothing Then

    ' Display a message when one of the designated cells has been
    ' changed.
    ' Place your code here.
    MsgBox "Cell " & Target.Address & " has changed."

End If
End Sub



##6

Sub Finished()
'
' Finished Macro
'

'
    Sheets("QPermits").Select
End Sub

Sub FinishedBS()
    ' Scroll to top and select D5
    Application.Goto Reference:=Range("A1"), Scroll:=True
    Range("D5").Select

    ' Check value and respond accordingly
    If Range("D5").Value = "Insert Council Here" Then
        MsgBox "Must select council to continue", vbExclamation, "Selection Required"
    Else
        Sheets("Best Sheds Quoting").Select
    End If
End Sub
Sub BackQPermits()
'
' BackQPermits Macro
'

'
    Sheets("Questionnaire").Select
End Sub
Sub Qpermit()
'

    Dim ws As Worksheet
    Set ws = Sheets("Construction") ' Adjust sheet name if needed

    Dim footingType As String
    Dim footingValue As Variant

    footingType = Trim(ws.Range("B15").Value)
    footingValue = ws.Range("B18").Value

    If (footingType = "Footings only" Or footingType = "Partial slab: Insert Details Below") And IsEmpty(footingValue) Then
        MsgBox "Footings have not been entered. Enter footing amount and try again", vbExclamation
        Application.Goto ws.Range("A1"), True
        Range("B18").Select
    Else
        Sheets("Questionnaire").Select
        ActiveWindow.SmallScroll Down:=-12
    End If


End Sub
Sub CoverSheet()
'
' Finished Macro
'

'
    Sheets("BBB Estimate").Select
End Sub


##7

Sub ABCFORM()
'
' ABCFORM Macro
'

'
    Sheets("ABC & BPA Form").Select
End Sub

Sub TRUEINPUTBOX()
Worksheet_Change(ByVal Target As Range)
If Target.Value <> "Lost" Then Exit Sub
Target.Offset(, 1) = InputBox("Enter lowest bid")
End Sub
Sub FALSEINPUTBOX()

If M208.Value > "TRUE" Then Exit Sub
N208.Offset(, 1) = InputBox("What is the intended use of the proposed shed?")

End Sub

Sub ENTER_VALUE()
    Dim FileImport  As Variant
    Dim rng         As Range, fnd As Range
   
    Const Prompt As String = "Please provide items intended to be stored in shed:"
   
   Set rng = Range(N208)
   If rng = True Then Exit Sub
   If rng = False Then
   
   
    'search range
    'Set rng = Range(Range("N209"), Range("N" & Rows.Count).End(xlUp))

    'Do
        'Set fnd = rng.Find(0, LookIn:=xlValues, lookat:=xlWhole)
        'If Not fnd Is Nothing Then
            'fnd.Select
          ' FileImport = InputBox(Prompt, "Please provide items intended to be stored in shed:")
            'Cancel pressed
            'If StrPtr(FileImport) = 0 Then Exit Sub
            'inform user
            'If Val(FileImport) = 0 Then MsgBox Prompt & Chr(10) & _
                                       "Please Provide Amount", 48, "Entry Required"
            'Update Range
            'fnd.Value = Val(FileImport)
        'End If
    
   mlt = Application.InputBox("Input items to be stored in the shed:")

    ActiveSheet.Range("N208").Value = mlt
    'Loop Until fnd Is Nothing
   
End Sub

Sub Test352()

If Range("L208") = False Then
mlt = Application.InputBox("Input items to be stored in the shed:")
            ActiveSheet.Range("N208").Value = mlt
End If

End Sub


##8

Sub RequestforInvoice()

    Workbooks.Open "Z:\Glenn\Request for Invoice 2021.xlsx"

End Sub

Sub OfficeQuoteRequestForm()

    Workbooks.Open "Z:\Glenn\Quotation request - Master.xls"

End Sub

Sub CustomQuoteRequestForm()

    Workbooks.Open "Z:\Glenn\A - QUOTE REQUEST-TEMPLATE Input-V5.xlsx"

End Sub
Sub Whiteboard()

    Workbooks.Open "Z:\Glenn\CURRENT - YTD - 2021 - 2022 Whiteboard.xlsx - Shortcut"

End Sub
Sub CombinedAllotment()

    ThisWorkbook.FollowHyperlink "Z:\Glenn\Request for Combined Allotment.pdf"

End Sub
Sub RefundRequest()

    ThisWorkbook.FollowHyperlink "Z:\Glenn\Refund request form 2020.pdf"

End Sub

Sub PricelessCarport()

    ThisWorkbook.FollowHyperlink "Z:\Glenn\Priceless Carport.pdf"

End Sub
Sub PricelessGarage()

    ThisWorkbook.FollowHyperlink "Z:\Glenn\Priceless Garage.pdf"

End Sub
Sub PricelessGaraport()

    ThisWorkbook.FollowHyperlink "Z:\Glenn\Priceless Garaport.pdf"

End Sub
Sub PricelessBarn()

    ThisWorkbook.FollowHyperlink "Z:\Glenn\Priceless Barn.pdf"

End Sub

Sub TimesheetTemplate()

    ThisWorkbook.FollowHyperlink "Z:\Glenn\Timesheet Template.docx"

End Sub

Sub SpeedDial()

    ThisWorkbook.FollowHyperlink "Z:\Glenn\Head Office Personell & Speed Dial Numbers.docx"

End Sub

Sub FarmUse()

    ThisWorkbook.FollowHyperlink "Z:\Glenn\Farm Use.docx"

End Sub

Sub BMPTemplate()

    ThisWorkbook.FollowHyperlink "Z:\Glenn\Outbuildings-BMP-Template.docx"

End Sub

Sub BuildingpermitAmendment()

    ThisWorkbook.FollowHyperlink "Z:\Glenn\Building permit amendment application.pdf"

End Sub

Sub EngingeeringRequestForm()

    Workbooks.Open "Z:\Glenn\Engineering Request Form.xlsx"

End Sub


##9

Sub FindForms()
'
' FindForms Macro
'

'
    Sheets("BPA Invoice").Select
End Sub
